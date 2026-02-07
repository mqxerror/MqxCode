#!/usr/bin/env python3
"""
MCP Server for Feature Management
==================================

Provides tools to manage features in the autonomous coding system,
replacing the previous FastAPI-based REST API.

Tools:
- feature_get_stats: Get progress statistics
- feature_get_next: Get next feature to implement
- feature_get_for_regression: Get random passing features for testing
- feature_mark_passing: Mark a feature as passing
- feature_skip: Skip a feature (move to end of queue)
- feature_mark_in_progress: Mark a feature as in-progress
- feature_clear_in_progress: Clear in-progress status
- feature_create_bulk: Create multiple features at once
- feature_create: Create a single feature
"""

import datetime
import json
import os
import shutil
import subprocess
import sys
import threading
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, Field
from sqlalchemy.sql.expression import func

# Add parent directory to path so we can import from api module
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.database import Feature, StatusChangeLog, create_database
from api.migration import migrate_json_to_sqlite

# Configuration from environment
PROJECT_DIR = Path(os.environ.get("PROJECT_DIR", ".")).resolve()


# Pydantic models for input validation
class MarkPassingInput(BaseModel):
    """Input for marking a feature as passing."""
    feature_id: int = Field(..., description="The ID of the feature to mark as passing", ge=1)


class SkipFeatureInput(BaseModel):
    """Input for skipping a feature."""
    feature_id: int = Field(..., description="The ID of the feature to skip", ge=1)


class MarkInProgressInput(BaseModel):
    """Input for marking a feature as in-progress."""
    feature_id: int = Field(..., description="The ID of the feature to mark as in-progress", ge=1)


class ClearInProgressInput(BaseModel):
    """Input for clearing in-progress status."""
    feature_id: int = Field(..., description="The ID of the feature to clear in-progress status", ge=1)


class RegressionInput(BaseModel):
    """Input for getting regression features."""
    limit: int = Field(default=3, ge=1, le=10, description="Maximum number of passing features to return")


class FeatureCreateItem(BaseModel):
    """Schema for creating a single feature."""
    category: str = Field(..., min_length=1, max_length=100, description="Feature category")
    name: str = Field(..., min_length=1, max_length=255, description="Feature name")
    description: str = Field(..., min_length=1, description="Detailed description")
    steps: list[str] = Field(..., min_length=1, description="Implementation/test steps")


class BulkCreateInput(BaseModel):
    """Input for bulk creating features."""
    features: list[FeatureCreateItem] = Field(..., min_length=1, description="List of features to create")


# Global database session maker (initialized on startup)
_session_maker = None
_engine = None

# Lock for priority assignment to prevent race conditions
_priority_lock = threading.Lock()


@asynccontextmanager
async def server_lifespan(server: FastMCP):
    """Initialize database on startup, cleanup on shutdown."""
    global _session_maker, _engine

    # Create project directory if it doesn't exist
    PROJECT_DIR.mkdir(parents=True, exist_ok=True)

    # Initialize database
    _engine, _session_maker = create_database(PROJECT_DIR)

    # Run migration if needed (converts legacy JSON to SQLite)
    migrate_json_to_sqlite(PROJECT_DIR, _session_maker)

    yield

    # Cleanup
    if _engine:
        _engine.dispose()


# Initialize the MCP server
mcp = FastMCP("features", lifespan=server_lifespan)


def get_session():
    """Get a new database session."""
    if _session_maker is None:
        raise RuntimeError("Database not initialized")
    return _session_maker()


@mcp.tool()
def feature_get_stats() -> str:
    """Get statistics about feature completion progress.

    Returns the number of passing features, in-progress features, total features,
    and completion percentage. Use this to track overall progress of the implementation.

    Returns:
        JSON with: passing (int), in_progress (int), total (int), percentage (float)
    """
    session = get_session()
    try:
        total = session.query(Feature).count()
        passing = session.query(Feature).filter(Feature.passes == True).count()
        in_progress = session.query(Feature).filter(Feature.in_progress == True).count()
        percentage = round((passing / total) * 100, 1) if total > 0 else 0.0

        return json.dumps({
            "passing": passing,
            "in_progress": in_progress,
            "total": total,
            "percentage": percentage
        }, indent=2)
    finally:
        session.close()


@mcp.tool()
def feature_get_next() -> str:
    """Get the highest-priority pending feature to work on.

    Returns the feature with the lowest priority number that has passes=false.
    Use this at the start of each coding session to determine what to implement next.

    Returns:
        JSON with feature details (id, priority, category, name, description, steps, passes, in_progress)
        or error message if all features are passing.
    """
    session = get_session()
    try:
        feature = (
            session.query(Feature)
            .filter(Feature.passes == False)
            .order_by(Feature.priority.asc(), Feature.id.asc())
            .first()
        )

        if feature is None:
            return json.dumps({"error": "All features are passing! No more work to do."})

        return json.dumps(feature.to_dict(), indent=2)
    finally:
        session.close()


@mcp.tool()
def feature_get_for_regression(
    limit: Annotated[int, Field(default=3, ge=1, le=10, description="Maximum number of passing features to return")] = 3
) -> str:
    """Get random passing features for regression testing.

    Returns a random selection of features that are currently passing.
    Use this to verify that previously implemented features still work
    after making changes.

    Args:
        limit: Maximum number of features to return (1-10, default 3)

    Returns:
        JSON with: features (list of feature objects), count (int)
    """
    session = get_session()
    try:
        features = (
            session.query(Feature)
            .filter(Feature.passes == True)
            .order_by(func.random())
            .limit(limit)
            .all()
        )

        return json.dumps({
            "features": [f.to_dict() for f in features],
            "count": len(features)
        }, indent=2)
    finally:
        session.close()


# =============================================================================
# Rate Limiting & Backup State
# =============================================================================
_mark_passing_timestamps: list[float] = []
_MAX_MARKS_PER_WINDOW = 3
_WINDOW_SECONDS = 300  # 5 minutes
_last_backup_time: float = 0
_BACKUP_COOLDOWN = 60  # seconds between backups


def _check_rate_limit() -> tuple[bool, str]:
    """Prevent mass-marking by limiting marks per time window."""
    now = time.time()
    _mark_passing_timestamps[:] = [t for t in _mark_passing_timestamps if now - t < _WINDOW_SECONDS]
    if len(_mark_passing_timestamps) >= _MAX_MARKS_PER_WINDOW:
        oldest = min(_mark_passing_timestamps)
        wait = int(_WINDOW_SECONDS - (now - oldest))
        return False, (
            f"Rate limit: max {_MAX_MARKS_PER_WINDOW} features per {_WINDOW_SECONDS // 60} minutes. "
            f"Wait {wait}s. This prevents mass-marking without proper verification."
        )
    return True, ""


def _backup_database() -> None:
    """Create timestamped backup of features.db before status changes."""
    global _last_backup_time
    now = time.time()
    if now - _last_backup_time < _BACKUP_COOLDOWN:
        return
    db_path = PROJECT_DIR / "features.db"
    if db_path.exists():
        backup_dir = PROJECT_DIR / ".features_backups"
        backup_dir.mkdir(exist_ok=True)
        ts = datetime.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        shutil.copy2(db_path, backup_dir / f"features_{ts}.db")
        # Keep last 20 backups
        backups = sorted(backup_dir.glob("features_*.db"))
        for old in backups[:-20]:
            old.unlink()
        _last_backup_time = now


def _log_status_change(session, feature, old_status: str, new_status: str,
                       evidence: str = None, verification_output: str = None) -> None:
    """Write an audit record for every status change."""
    log = StatusChangeLog(
        feature_id=feature.id,
        feature_name=feature.name,
        old_status=old_status,
        new_status=new_status,
        evidence=evidence,
        verification_output=verification_output,
        timestamp=datetime.datetime.utcnow().isoformat() + "Z",
    )
    session.add(log)


@mcp.tool()
def feature_mark_passing(
    feature_id: Annotated[int, Field(description="The ID of the feature to mark as passing", ge=1)],
    evidence: Annotated[str, Field(
        description=(
            "MANDATORY verification evidence. Describe specifically what you tested and "
            "what the results were. Include command outputs, screenshot observations, or "
            "test results. Must be at least 50 characters. Generic claims like 'tested and works' "
            "will be rejected."
        ),
        min_length=50,
    )] = ""
) -> str:
    """Mark a feature as passing after successful implementation AND verification.

    REQUIREMENTS — all must be met or the call is rejected:
    1. Feature must be in_progress=true (call feature_mark_in_progress first)
    2. You must provide verification evidence (min 50 chars) describing what you verified
    3. If the feature has a verification_command, it is executed automatically and must exit 0
    4. Rate limit: max 3 features per 5 minutes

    Args:
        feature_id: The ID of the feature to mark as passing
        evidence: Detailed description of what you verified (min 50 characters)

    Returns:
        JSON with the updated feature details, or error explaining why verification failed.
    """
    # --- Layer 1: Rate limit ---
    allowed, msg = _check_rate_limit()
    if not allowed:
        return json.dumps({"error": msg})

    # --- Layer 2: Evidence check ---
    if not evidence or len(evidence.strip()) < 50:
        return json.dumps({
            "error": "Verification evidence is REQUIRED and must be at least 50 characters. "
                     "Describe specifically what you tested and what the results were."
        })

    session = get_session()
    try:
        feature = session.query(Feature).filter(Feature.id == feature_id).first()
        if feature is None:
            return json.dumps({"error": f"Feature with ID {feature_id} not found"})

        # --- Layer 3: State machine — must be in_progress ---
        if not feature.in_progress:
            return json.dumps({
                "error": f"Feature {feature_id} is NOT in-progress. "
                         f"You must call feature_mark_in_progress({feature_id}) first, "
                         f"do the work, then call feature_mark_passing."
            })

        # --- Layer 4: Run verification command if set ---
        verification_output = None
        if feature.verification_command:
            try:
                result = subprocess.run(
                    feature.verification_command,
                    shell=True,
                    cwd=str(PROJECT_DIR),
                    capture_output=True,
                    text=True,
                    timeout=120,
                )
                verification_output = (result.stdout[-1000:] if result.stdout else "") + \
                                      (result.stderr[-1000:] if result.stderr else "")
                if result.returncode != 0:
                    return json.dumps({
                        "error": f"Verification command FAILED (exit code {result.returncode}). "
                                 f"Fix the issues and try again.",
                        "command": feature.verification_command,
                        "stdout": result.stdout[-500:] if result.stdout else "",
                        "stderr": result.stderr[-500:] if result.stderr else "",
                    })
            except subprocess.TimeoutExpired:
                return json.dumps({
                    "error": "Verification command timed out (120s limit).",
                    "command": feature.verification_command,
                })

        # --- Layer 5: Backup database before change ---
        _backup_database()

        # --- Layer 6: Apply the change ---
        old_status = "in_progress"
        feature.passes = True
        feature.in_progress = False
        feature.verification_evidence = evidence.strip()
        feature.marked_passing_at = datetime.datetime.utcnow().isoformat() + "Z"

        # --- Layer 7: Audit log ---
        _log_status_change(session, feature, old_status, "passing",
                           evidence=evidence.strip(),
                           verification_output=verification_output)

        session.commit()
        session.refresh(feature)

        # Record timestamp for rate limiter
        _mark_passing_timestamps.append(time.time())

        return json.dumps(feature.to_dict(), indent=2)
    finally:
        session.close()


@mcp.tool()
def feature_skip(
    feature_id: Annotated[int, Field(description="The ID of the feature to skip", ge=1)]
) -> str:
    """Skip a feature by moving it to the end of the priority queue.

    Use this when a feature cannot be implemented yet due to:
    - Dependencies on other features that aren't implemented yet
    - External blockers (missing assets, unclear requirements)
    - Technical prerequisites that need to be addressed first

    The feature's priority is set to max_priority + 1, so it will be
    worked on after all other pending features. Also clears the in_progress
    flag so the feature returns to "pending" status.

    Args:
        feature_id: The ID of the feature to skip

    Returns:
        JSON with skip details: id, name, old_priority, new_priority, message
    """
    session = get_session()
    try:
        feature = session.query(Feature).filter(Feature.id == feature_id).first()

        if feature is None:
            return json.dumps({"error": f"Feature with ID {feature_id} not found"})

        if feature.passes:
            return json.dumps({"error": "Cannot skip a feature that is already passing"})

        old_priority = feature.priority

        # Use lock to prevent race condition in priority assignment
        with _priority_lock:
            # Get max priority and set this feature to max + 1
            max_priority_result = session.query(Feature.priority).order_by(Feature.priority.desc()).first()
            new_priority = (max_priority_result[0] + 1) if max_priority_result else 1

            feature.priority = new_priority
            feature.in_progress = False
            session.commit()

        session.refresh(feature)

        return json.dumps({
            "id": feature.id,
            "name": feature.name,
            "old_priority": old_priority,
            "new_priority": new_priority,
            "message": f"Feature '{feature.name}' moved to end of queue"
        }, indent=2)
    finally:
        session.close()


@mcp.tool()
def feature_mark_in_progress(
    feature_id: Annotated[int, Field(description="The ID of the feature to mark as in-progress", ge=1)]
) -> str:
    """Mark a feature as in-progress. Call immediately after feature_get_next().

    This prevents other agent sessions from working on the same feature.
    Use this as soon as you retrieve a feature to work on.

    Args:
        feature_id: The ID of the feature to mark as in-progress

    Returns:
        JSON with the updated feature details, or error if not found or already in-progress.
    """
    session = get_session()
    try:
        feature = session.query(Feature).filter(Feature.id == feature_id).first()

        if feature is None:
            return json.dumps({"error": f"Feature with ID {feature_id} not found"})

        if feature.passes:
            return json.dumps({"error": f"Feature with ID {feature_id} is already passing"})

        if feature.in_progress:
            return json.dumps({"error": f"Feature with ID {feature_id} is already in-progress"})

        feature.in_progress = True
        session.commit()
        session.refresh(feature)

        return json.dumps(feature.to_dict(), indent=2)
    finally:
        session.close()


@mcp.tool()
def feature_clear_in_progress(
    feature_id: Annotated[int, Field(description="The ID of the feature to clear in-progress status", ge=1)]
) -> str:
    """Clear in-progress status from a feature.

    Use this when abandoning a feature or manually unsticking a stuck feature.
    The feature will return to the pending queue.

    Args:
        feature_id: The ID of the feature to clear in-progress status

    Returns:
        JSON with the updated feature details, or error if not found.
    """
    session = get_session()
    try:
        feature = session.query(Feature).filter(Feature.id == feature_id).first()

        if feature is None:
            return json.dumps({"error": f"Feature with ID {feature_id} not found"})

        feature.in_progress = False
        session.commit()
        session.refresh(feature)

        return json.dumps(feature.to_dict(), indent=2)
    finally:
        session.close()


@mcp.tool()
def feature_create_bulk(
    features: Annotated[list[dict], Field(description="List of features to create, each with category, name, description, and steps")]
) -> str:
    """Create multiple features in a single operation.

    Features are assigned sequential priorities based on their order.
    All features start with passes=false.

    This is typically used by the initializer agent to set up the initial
    feature list from the app specification.

    Args:
        features: List of features to create, each with:
            - category (str): Feature category
            - name (str): Feature name
            - description (str): Detailed description
            - steps (list[str]): Implementation/test steps

    Returns:
        JSON with: created (int) - number of features created
    """
    session = get_session()
    try:
        # Use lock to prevent race condition in priority assignment
        with _priority_lock:
            # Get the starting priority
            max_priority_result = session.query(Feature.priority).order_by(Feature.priority.desc()).first()
            start_priority = (max_priority_result[0] + 1) if max_priority_result else 1

            created_count = 0
            for i, feature_data in enumerate(features):
                # Validate required fields
                if not all(key in feature_data for key in ["category", "name", "description", "steps"]):
                    return json.dumps({
                        "error": f"Feature at index {i} missing required fields (category, name, description, steps)"
                    })

                db_feature = Feature(
                    priority=start_priority + i,
                    category=feature_data["category"],
                    name=feature_data["name"],
                    description=feature_data["description"],
                    steps=feature_data["steps"],
                    passes=False,
                )
                session.add(db_feature)
                created_count += 1

            session.commit()

        return json.dumps({"created": created_count}, indent=2)
    except Exception as e:
        session.rollback()
        return json.dumps({"error": str(e)})
    finally:
        session.close()


@mcp.tool()
def feature_create(
    category: Annotated[str, Field(min_length=1, max_length=100, description="Feature category (e.g., 'Authentication', 'API', 'UI')")],
    name: Annotated[str, Field(min_length=1, max_length=255, description="Feature name")],
    description: Annotated[str, Field(min_length=1, description="Detailed description of the feature")],
    steps: Annotated[list[str], Field(min_length=1, description="List of implementation/verification steps")]
) -> str:
    """Create a single feature in the project backlog.

    Use this when the user asks to add a new feature, capability, or test case.
    The feature will be added with the next available priority number.

    Args:
        category: Feature category for grouping (e.g., 'Authentication', 'API', 'UI')
        name: Descriptive name for the feature
        description: Detailed description of what this feature should do
        steps: List of steps to implement or verify the feature

    Returns:
        JSON with the created feature details including its ID
    """
    session = get_session()
    try:
        # Use lock to prevent race condition in priority assignment
        with _priority_lock:
            # Get the next priority
            max_priority_result = session.query(Feature.priority).order_by(Feature.priority.desc()).first()
            next_priority = (max_priority_result[0] + 1) if max_priority_result else 1

            db_feature = Feature(
                priority=next_priority,
                category=category,
                name=name,
                description=description,
                steps=steps,
                passes=False,
            )
            session.add(db_feature)
            session.commit()

        session.refresh(db_feature)

        return json.dumps({
            "success": True,
            "message": f"Created feature: {name}",
            "feature": db_feature.to_dict()
        }, indent=2)
    except Exception as e:
        session.rollback()
        return json.dumps({"error": str(e)})
    finally:
        session.close()


if __name__ == "__main__":
    mcp.run()
