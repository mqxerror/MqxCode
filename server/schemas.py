"""
Pydantic Schemas
================

Request/Response models for the API endpoints.
"""

from __future__ import annotations

import base64
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

# Import model constants from registry (single source of truth)
_root = Path(__file__).parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from registry import DEFAULT_MODEL, VALID_MODELS

# ============================================================================
# Project Schemas
# ============================================================================

class ProjectCreate(BaseModel):
    """Request schema for creating a new project."""
    name: str = Field(..., min_length=1, max_length=50, pattern=r'^[a-zA-Z0-9_-]+$')
    path: str = Field(..., min_length=1, description="Absolute path to project directory")
    spec_method: Literal["claude", "manual"] = "claude"


class ProjectStats(BaseModel):
    """Project statistics."""
    passing: int = 0
    in_progress: int = 0
    total: int = 0
    percentage: float = 0.0


class ProjectSummary(BaseModel):
    """Summary of a project for list view."""
    name: str
    path: str
    has_spec: bool
    stats: ProjectStats


class ProjectDetail(BaseModel):
    """Detailed project information."""
    name: str
    path: str
    has_spec: bool
    stats: ProjectStats
    prompts_dir: str


class ProjectPrompts(BaseModel):
    """Project prompt files content."""
    app_spec: str = ""
    initializer_prompt: str = ""
    coding_prompt: str = ""


class ProjectPromptsUpdate(BaseModel):
    """Request schema for updating project prompts."""
    app_spec: Optional[str] = None
    initializer_prompt: Optional[str] = None
    coding_prompt: Optional[str] = None


# ============================================================================
# Feature Schemas
# ============================================================================

class FeatureBase(BaseModel):
    """Base feature attributes."""
    category: str
    name: str
    description: str
    steps: list[str]


class FeatureCreate(FeatureBase):
    """Request schema for creating a new feature."""
    priority: Optional[int] = None


class FeatureUpdate(BaseModel):
    """Request schema for updating a feature (partial updates allowed)."""
    category: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    steps: Optional[List[str]] = None
    priority: Optional[int] = None


class FeatureResponse(FeatureBase):
    """Response schema for a feature."""
    id: int
    priority: int
    passes: bool
    in_progress: bool
    assigned_to_agent_id: Optional[str] = None
    attempt_count: int = 0
    blocked_reason: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FeatureWithDependencies(FeatureResponse):
    """Feature response with dependency information."""
    depends_on: List[int] = []
    blocks: List[int] = []
    dependencies_satisfied: bool = True


class FeatureListResponse(BaseModel):
    """Response containing list of features organized by status."""
    pending: list[FeatureResponse]
    in_progress: list[FeatureResponse]
    done: list[FeatureResponse]


class FeatureBulkCreate(BaseModel):
    """Request schema for bulk creating features."""
    features: list[FeatureCreate]
    starting_priority: Optional[int] = None  # If None, appends after max priority


class FeatureBulkCreateResponse(BaseModel):
    """Response for bulk feature creation."""
    created: int
    features: list[FeatureResponse]


# ============================================================================
# Agent Schemas
# ============================================================================

class AgentStartRequest(BaseModel):
    """Request schema for starting the agent."""
    yolo_mode: Optional[bool] = None  # None means use global settings
    model: Optional[str] = None  # None means use global settings

    @field_validator('model')
    @classmethod
    def validate_model(cls, v: Optional[str]) -> Optional[str]:
        """Validate model is in the allowed list."""
        if v is not None and v not in VALID_MODELS:
            raise ValueError(f"Invalid model. Must be one of: {VALID_MODELS}")
        return v


class AgentStatus(BaseModel):
    """Current agent status."""
    status: Literal["stopped", "running", "paused", "crashed"]
    pid: Optional[int] = None
    started_at: Optional[datetime] = None
    yolo_mode: bool = False
    model: Optional[str] = None  # Model being used by running agent


class AgentActionResponse(BaseModel):
    """Response for agent control actions."""
    success: bool
    status: str
    message: str = ""


# ============================================================================
# Setup Schemas
# ============================================================================

class SetupStatus(BaseModel):
    """System setup status."""
    claude_cli: bool
    credentials: bool
    node: bool
    npm: bool


# ============================================================================
# WebSocket Message Schemas
# ============================================================================

class WSProgressMessage(BaseModel):
    """WebSocket message for progress updates."""
    type: Literal["progress"] = "progress"
    passing: int
    total: int
    percentage: float


class WSFeatureUpdateMessage(BaseModel):
    """WebSocket message for feature status updates."""
    type: Literal["feature_update"] = "feature_update"
    feature_id: int
    passes: bool


class WSLogMessage(BaseModel):
    """WebSocket message for agent log output."""
    type: Literal["log"] = "log"
    line: str
    timestamp: datetime


class WSAgentStatusMessage(BaseModel):
    """WebSocket message for agent status changes."""
    type: Literal["agent_status"] = "agent_status"
    status: str


# ============================================================================
# Multi-Agent WebSocket Message Schemas
# ============================================================================

class WSAgentPoolMessage(BaseModel):
    """WebSocket message for agent pool status updates."""
    type: Literal["agent_pool"] = "agent_pool"
    agents: List[dict]
    active_count: int
    idle_count: int
    working_count: int


class WSAgentLogMessage(BaseModel):
    """WebSocket message for individual agent log output."""
    type: Literal["agent_log"] = "agent_log"
    agent_id: str
    line: str
    timestamp: datetime


class WSAgentInstanceStatusMessage(BaseModel):
    """WebSocket message for individual agent status changes."""
    type: Literal["agent_instance_status"] = "agent_instance_status"
    agent_id: str
    status: str
    feature_id: Optional[int] = None


class WSDependencyResolvedMessage(BaseModel):
    """WebSocket message when a dependency is resolved."""
    type: Literal["dependency_resolved"] = "dependency_resolved"
    feature_id: int
    unblocked_feature_ids: List[int]


# ============================================================================
# Spec Chat Schemas
# ============================================================================

# Maximum image file size: 5 MB
MAX_IMAGE_SIZE = 5 * 1024 * 1024


class ImageAttachment(BaseModel):
    """Image attachment from client for spec creation chat."""
    filename: str = Field(..., min_length=1, max_length=255)
    mimeType: Literal['image/jpeg', 'image/png']
    base64Data: str

    @field_validator('base64Data')
    @classmethod
    def validate_base64_and_size(cls, v: str) -> str:
        """Validate that base64 data is valid and within size limit."""
        try:
            decoded = base64.b64decode(v)
            if len(decoded) > MAX_IMAGE_SIZE:
                raise ValueError(
                    f'Image size ({len(decoded) / (1024 * 1024):.1f} MB) exceeds '
                    f'maximum of {MAX_IMAGE_SIZE // (1024 * 1024)} MB'
                )
            return v
        except Exception as e:
            if 'Image size' in str(e):
                raise
            raise ValueError(f'Invalid base64 data: {e}')


# ============================================================================
# Filesystem Schemas
# ============================================================================

class DriveInfo(BaseModel):
    """Information about a drive (Windows only)."""
    letter: str
    label: str
    available: bool = True


class DirectoryEntry(BaseModel):
    """An entry in a directory listing."""
    name: str
    path: str  # POSIX format
    is_directory: bool
    is_hidden: bool = False
    size: Optional[int] = None  # Bytes, for files
    has_children: bool = False  # True if directory has subdirectories


class DirectoryListResponse(BaseModel):
    """Response for directory listing."""
    current_path: str  # POSIX format
    parent_path: Optional[str]
    entries: list[DirectoryEntry]
    drives: Optional[List[DriveInfo]] = None  # Windows only


class PathValidationResponse(BaseModel):
    """Response for path validation."""
    valid: bool
    exists: bool
    is_directory: bool
    can_read: bool
    can_write: bool
    message: str = ""


class CreateDirectoryRequest(BaseModel):
    """Request to create a new directory."""
    parent_path: str
    name: str = Field(..., min_length=1, max_length=255)


# ============================================================================
# Settings Schemas
# ============================================================================

# Note: VALID_MODELS and DEFAULT_MODEL are imported from registry at the top of this file


class ModelInfo(BaseModel):
    """Information about an available model."""
    id: str
    name: str


class SettingsResponse(BaseModel):
    """Response schema for global settings."""
    yolo_mode: bool = False
    model: str = DEFAULT_MODEL
    glm_mode: bool = False  # True if GLM API is configured via .env


class ModelsResponse(BaseModel):
    """Response schema for available models list."""
    models: list[ModelInfo]
    default: str


class SettingsUpdate(BaseModel):
    """Request schema for updating global settings."""
    yolo_mode: Optional[bool] = None
    model: Optional[str] = None

    @field_validator('model')
    @classmethod
    def validate_model(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_MODELS:
            raise ValueError(f"Invalid model. Must be one of: {VALID_MODELS}")
        return v


# ============================================================================
# Dev Server Schemas
# ============================================================================


class DevServerStartRequest(BaseModel):
    """Request schema for starting the dev server."""
    command: Optional[str] = None  # If None, uses effective command from config


class DevServerStatus(BaseModel):
    """Current dev server status."""
    status: Literal["stopped", "running", "crashed"]
    pid: Optional[int] = None
    url: Optional[str] = None
    command: Optional[str] = None
    started_at: Optional[datetime] = None


class DevServerActionResponse(BaseModel):
    """Response for dev server control actions."""
    success: bool
    status: Literal["stopped", "running", "crashed"]
    message: str = ""


class DevServerConfigResponse(BaseModel):
    """Response for dev server configuration."""
    detected_type: Optional[str] = None
    detected_command: Optional[str] = None
    custom_command: Optional[str] = None
    effective_command: Optional[str] = None


class DevServerConfigUpdate(BaseModel):
    """Request schema for updating dev server configuration."""
    custom_command: Optional[str] = None  # None clears the custom command


# ============================================================================
# Dev Server WebSocket Message Schemas
# ============================================================================


class WSDevLogMessage(BaseModel):
    """WebSocket message for dev server log output."""
    type: Literal["dev_log"] = "dev_log"
    line: str
    timestamp: datetime


class WSDevServerStatusMessage(BaseModel):
    """WebSocket message for dev server status changes."""
    type: Literal["dev_server_status"] = "dev_server_status"
    status: Literal["stopped", "running", "crashed"]
    url: Optional[str] = None


# ============================================================================
# Config Schemas
# ============================================================================


class ConfigFile(BaseModel):
    """Information about a configuration file."""
    name: str
    path: str
    description: str
    category: str


class ClaudeConfig(BaseModel):
    """Structure of the Claude configuration directory."""
    guidance: list[ConfigFile]
    commands: list[ConfigFile]
    skills: list[ConfigFile]
    agents: list[ConfigFile]
    templates: list[ConfigFile]


class ConfigFileContent(BaseModel):
    """Response containing a config file's content."""
    name: str
    path: str
    category: str
    content: str


class ConfigFileUpdate(BaseModel):
    """Request to update a config file's content."""
    content: str = Field(..., min_length=0, max_length=500000)


# ============================================================================
# Server Tasks Schemas
# ============================================================================


class TaskRunRequest(BaseModel):
    """Request to run a server task."""
    task: str = Field(
        ...,
        description="Predefined task name or 'custom' for custom command"
    )
    custom_cmd: Optional[str] = Field(
        None,
        description="Custom command to run (only used when task='custom')"
    )


class TaskResult(BaseModel):
    """Result of a task execution."""
    output: str
    exit_code: int
    command: str
    success: bool


class PredefinedTask(BaseModel):
    """Information about a predefined task."""
    name: str
    description: str
    command: str


class PredefinedTasksResponse(BaseModel):
    """List of available predefined tasks."""
    tasks: list[PredefinedTask]


class HealthStatus(BaseModel):
    """System health status."""
    agent: str = Field(..., description="Agent subsystem status")
    database: str = Field(..., description="Database status")
    ui: str = Field(..., description="UI build status")
