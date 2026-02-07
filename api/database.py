"""
Database Models and Connection
==============================

SQLite database schema for feature storage using SQLAlchemy.
Includes verification enforcement and audit logging.
"""

from pathlib import Path
from typing import Optional

from sqlalchemy import Boolean, Column, Integer, String, Text, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.types import JSON

Base = declarative_base()


class Feature(Base):
    """Feature model representing a test case/feature to implement."""

    __tablename__ = "features"

    id = Column(Integer, primary_key=True, index=True)
    priority = Column(Integer, nullable=False, default=999, index=True)
    category = Column(String(100), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    steps = Column(JSON, nullable=False)  # Stored as JSON array
    passes = Column(Boolean, default=False, index=True)
    in_progress = Column(Boolean, default=False, index=True)
    # Verification fields
    verification_command = Column(Text, nullable=True)  # Shell command that must pass (exit 0)
    verification_evidence = Column(Text, nullable=True)  # Agent's proof of work
    marked_passing_at = Column(Text, nullable=True)  # ISO timestamp when marked passing

    def to_dict(self) -> dict:
        """Convert feature to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "priority": self.priority,
            "category": self.category,
            "name": self.name,
            "description": self.description,
            "steps": self.steps,
            "passes": self.passes,
            "in_progress": self.in_progress,
            "verification_command": self.verification_command,
            "verification_evidence": self.verification_evidence,
            "marked_passing_at": self.marked_passing_at,
        }


class StatusChangeLog(Base):
    """Audit log for feature status changes."""

    __tablename__ = "status_change_log"

    id = Column(Integer, primary_key=True, index=True)
    feature_id = Column(Integer, nullable=False, index=True)
    feature_name = Column(String(255), nullable=False)
    old_status = Column(String(50), nullable=False)
    new_status = Column(String(50), nullable=False)
    evidence = Column(Text, nullable=True)
    verification_output = Column(Text, nullable=True)
    timestamp = Column(Text, nullable=False)


def get_database_path(project_dir: Path) -> Path:
    """Return the path to the SQLite database for a project."""
    return project_dir / "features.db"


def get_database_url(project_dir: Path) -> str:
    """Return the SQLAlchemy database URL for a project.

    Uses POSIX-style paths (forward slashes) for cross-platform compatibility.
    """
    db_path = get_database_path(project_dir)
    return f"sqlite:///{db_path.as_posix()}"


def _migrate_add_columns(engine) -> None:
    """Add new columns to existing databases that don't have them."""
    from sqlalchemy import text

    with engine.connect() as conn:
        result = conn.execute(text("PRAGMA table_info(features)"))
        columns = [row[1] for row in result.fetchall()]

        migrations = {
            "in_progress": "ALTER TABLE features ADD COLUMN in_progress BOOLEAN DEFAULT 0",
            "verification_command": "ALTER TABLE features ADD COLUMN verification_command TEXT",
            "verification_evidence": "ALTER TABLE features ADD COLUMN verification_evidence TEXT",
            "marked_passing_at": "ALTER TABLE features ADD COLUMN marked_passing_at TEXT",
        }

        for col_name, sql in migrations.items():
            if col_name not in columns:
                conn.execute(text(sql))

        conn.commit()


def create_database(project_dir: Path) -> tuple:
    """
    Create database and return engine + session maker.

    Args:
        project_dir: Directory containing the project

    Returns:
        Tuple of (engine, SessionLocal)
    """
    db_url = get_database_url(project_dir)
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)

    # Migrate existing databases
    _migrate_add_columns(engine)

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return engine, SessionLocal


# Global session maker - will be set when server starts
_session_maker: Optional[sessionmaker] = None


def set_session_maker(session_maker: sessionmaker) -> None:
    """Set the global session maker."""
    global _session_maker
    _session_maker = session_maker


def get_db() -> Session:
    """
    Dependency for FastAPI to get database session.

    Yields a database session and ensures it's closed after use.
    """
    if _session_maker is None:
        raise RuntimeError("Database not initialized. Call set_session_maker first.")

    db = _session_maker()
    try:
        yield db
    finally:
        db.close()
