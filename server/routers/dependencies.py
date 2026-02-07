"""
Dependencies Router
===================

REST API endpoints for managing feature dependencies.
"""

from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent.resolve()))

from api.database import (
    Feature, FeatureDependency, create_database,
    check_dependencies_satisfied, get_available_features
)

# Get the root directory of the project
ROOT_DIR = Path(__file__).parent.parent.parent.resolve()

router = APIRouter(prefix="/api/projects/{project_name}/dependencies", tags=["dependencies"])


# Pydantic models
class DependencyInfo(BaseModel):
    """Information about a dependency relationship."""
    id: int
    feature_id: int
    depends_on_id: int
    dependency_type: str
    notes: Optional[str]
    created_at: Optional[str]


class FeatureNode(BaseModel):
    """Feature node in the dependency graph."""
    id: int
    name: str
    category: str
    passes: bool
    in_progress: bool
    priority: int


class DependencyEdge(BaseModel):
    """Edge in the dependency graph."""
    source: int  # depends_on_id
    target: int  # feature_id
    dependency_type: str


class DependencyGraph(BaseModel):
    """The full dependency graph."""
    features: List[FeatureNode]
    edges: List[DependencyEdge]
    blocked_features: List[int]
    ready_features: List[int]


class AddDependencyRequest(BaseModel):
    """Request to add a dependency."""
    depends_on_ids: List[int] = Field(..., min_length=1, description="Feature IDs to depend on")
    dependency_type: str = Field(default="blocks", description="Type: blocks, requires, related")
    notes: Optional[str] = Field(default=None, description="Optional notes")


class AddDependencyResponse(BaseModel):
    """Response after adding dependencies."""
    added: int
    errors: List[str]


class RemoveDependencyResponse(BaseModel):
    """Response after removing a dependency."""
    success: bool
    message: str


def get_project_dir(project_name: str) -> Path:
    """Get the project directory from the registry."""
    from registry import get_project_path

    project_path = get_project_path(project_name)
    if not project_path:
        raise HTTPException(status_code=404, detail=f"Project '{project_name}' not found")

    project_dir = Path(project_path)
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail=f"Project directory does not exist")

    return project_dir


def get_db_session(project_name: str) -> Session:
    """Get a database session for the project."""
    project_dir = get_project_dir(project_name)
    _, session_maker = create_database(project_dir)
    return session_maker()


@router.get("", response_model=DependencyGraph)
async def get_dependency_graph(project_name: str):
    """Get the full dependency graph for a project."""
    session = get_db_session(project_name)
    try:
        # Get all features
        features = session.query(Feature).order_by(Feature.priority).all()

        # Get all dependencies
        dependencies = session.query(FeatureDependency).all()

        # Build nodes
        nodes = [
            FeatureNode(
                id=f.id,
                name=f.name,
                category=f.category,
                passes=f.passes,
                in_progress=f.in_progress,
                priority=f.priority,
            )
            for f in features
        ]

        # Build edges
        edges = [
            DependencyEdge(
                source=d.depends_on_id,
                target=d.feature_id,
                dependency_type=d.dependency_type,
            )
            for d in dependencies
        ]

        # Find blocked and ready features
        blocked = []
        ready = []
        for f in features:
            if f.passes or f.in_progress:
                continue
            satisfied, _ = check_dependencies_satisfied(session, f.id)
            if satisfied:
                ready.append(f.id)
            else:
                blocked.append(f.id)

        return DependencyGraph(
            features=nodes,
            edges=edges,
            blocked_features=blocked,
            ready_features=ready,
        )
    finally:
        session.close()


@router.get("/features/{feature_id}")
async def get_feature_dependencies(project_name: str, feature_id: int):
    """Get dependencies for a specific feature."""
    session = get_db_session(project_name)
    try:
        feature = session.query(Feature).filter(Feature.id == feature_id).first()
        if not feature:
            raise HTTPException(status_code=404, detail=f"Feature {feature_id} not found")

        # Get features this depends on
        depends_on = []
        for dep in feature.dependencies_from:
            dep_feature = session.query(Feature).filter(Feature.id == dep.depends_on_id).first()
            if dep_feature:
                depends_on.append({
                    "id": dep_feature.id,
                    "name": dep_feature.name,
                    "passes": dep_feature.passes,
                    "in_progress": dep_feature.in_progress,
                    "dependency_type": dep.dependency_type,
                    "notes": dep.notes,
                })

        # Get features that depend on this
        blocks = []
        for dep in feature.dependencies_to:
            blocked_feature = session.query(Feature).filter(Feature.id == dep.feature_id).first()
            if blocked_feature:
                blocks.append({
                    "id": blocked_feature.id,
                    "name": blocked_feature.name,
                    "passes": blocked_feature.passes,
                    "in_progress": blocked_feature.in_progress,
                    "dependency_type": dep.dependency_type,
                })

        satisfied, unsatisfied = check_dependencies_satisfied(session, feature_id)

        return {
            "feature_id": feature_id,
            "feature_name": feature.name,
            "depends_on": depends_on,
            "blocks": blocks,
            "all_satisfied": satisfied,
            "unsatisfied_ids": unsatisfied,
        }
    finally:
        session.close()


@router.post("/features/{feature_id}", response_model=AddDependencyResponse)
async def add_feature_dependencies(
    project_name: str,
    feature_id: int,
    request: AddDependencyRequest,
):
    """Add dependencies to a feature."""
    session = get_db_session(project_name)
    try:
        feature = session.query(Feature).filter(Feature.id == feature_id).first()
        if not feature:
            raise HTTPException(status_code=404, detail=f"Feature {feature_id} not found")

        added = 0
        errors = []

        for dep_id in request.depends_on_ids:
            # Validate target exists
            dep_feature = session.query(Feature).filter(Feature.id == dep_id).first()
            if not dep_feature:
                errors.append(f"Feature {dep_id} not found")
                continue

            # Check for self-dependency
            if dep_id == feature_id:
                errors.append("Cannot depend on self")
                continue

            # Check for existing dependency
            existing = session.query(FeatureDependency).filter(
                FeatureDependency.feature_id == feature_id,
                FeatureDependency.depends_on_id == dep_id,
            ).first()
            if existing:
                errors.append(f"Dependency on {dep_id} already exists")
                continue

            # Check for circular dependency
            reverse = session.query(FeatureDependency).filter(
                FeatureDependency.feature_id == dep_id,
                FeatureDependency.depends_on_id == feature_id,
            ).first()
            if reverse:
                errors.append(f"Circular dependency: {dep_id} already depends on {feature_id}")
                continue

            # Add the dependency
            dep = FeatureDependency(
                feature_id=feature_id,
                depends_on_id=dep_id,
                dependency_type=request.dependency_type,
                notes=request.notes,
            )
            session.add(dep)
            added += 1

        session.commit()
        return AddDependencyResponse(added=added, errors=errors)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.delete("/features/{feature_id}/{depends_on_id}", response_model=RemoveDependencyResponse)
async def remove_feature_dependency(
    project_name: str,
    feature_id: int,
    depends_on_id: int,
):
    """Remove a dependency from a feature."""
    session = get_db_session(project_name)
    try:
        dep = session.query(FeatureDependency).filter(
            FeatureDependency.feature_id == feature_id,
            FeatureDependency.depends_on_id == depends_on_id,
        ).first()

        if not dep:
            raise HTTPException(status_code=404, detail="Dependency not found")

        session.delete(dep)
        session.commit()

        return RemoveDependencyResponse(
            success=True,
            message=f"Removed dependency: {feature_id} no longer depends on {depends_on_id}",
        )
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.get("/blocked")
async def get_blocked_features(project_name: str):
    """Get all features that are blocked by unsatisfied dependencies."""
    session = get_db_session(project_name)
    try:
        pending = session.query(Feature).filter(
            Feature.passes == False,
            Feature.in_progress == False,
        ).order_by(Feature.priority).all()

        blocked = []
        for feature in pending:
            satisfied, unsatisfied = check_dependencies_satisfied(session, feature.id)
            if not satisfied:
                unsatisfied_info = []
                for dep_id in unsatisfied:
                    dep_feature = session.query(Feature).filter(Feature.id == dep_id).first()
                    if dep_feature:
                        unsatisfied_info.append({
                            "id": dep_id,
                            "name": dep_feature.name,
                            "in_progress": dep_feature.in_progress,
                        })

                blocked.append({
                    "id": feature.id,
                    "name": feature.name,
                    "priority": feature.priority,
                    "unsatisfied_dependencies": unsatisfied_info,
                })

        return {
            "blocked_count": len(blocked),
            "blocked_features": blocked,
        }
    finally:
        session.close()


@router.get("/ready")
async def get_ready_features(project_name: str):
    """Get all features ready to work on (all dependencies satisfied)."""
    session = get_db_session(project_name)
    try:
        available = get_available_features(session)

        ready = [
            {
                "id": f.id,
                "name": f.name,
                "priority": f.priority,
                "category": f.category,
                "attempt_count": f.attempt_count,
            }
            for f in available
        ]

        return {
            "ready_count": len(ready),
            "ready_features": ready,
        }
    finally:
        session.close()
