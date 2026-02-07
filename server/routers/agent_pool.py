"""
Agent Pool Router
=================

REST API endpoints for managing agent pools in multi-agent mode.
"""

from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..services.agent_pool_manager import get_pool_manager, AgentPoolManager

# Get the root directory of the project
ROOT_DIR = Path(__file__).parent.parent.parent.resolve()

router = APIRouter(prefix="/api/projects/{project_name}/agents", tags=["agent-pool"])


# Pydantic models for request/response
class SpawnAgentsRequest(BaseModel):
    """Request to spawn new agents."""
    count: int = Field(default=1, ge=1, le=10, description="Number of agents to spawn")
    model: str = Field(default="claude-opus-4-6", description="Model to use")
    yolo_mode: bool = Field(default=False, description="Enable YOLO mode")


class SpawnAgentResponse(BaseModel):
    """Response after spawning agents."""
    spawned: int
    agents: List[dict]
    errors: List[str]


class AgentInfo(BaseModel):
    """Information about a single agent."""
    agent_id: str
    status: str
    pid: Optional[int]
    model: str
    yolo_mode: bool
    current_feature_id: Optional[int]
    started_at: Optional[str]


class PoolStatus(BaseModel):
    """Status of the entire agent pool."""
    project_name: str
    agents: List[AgentInfo]
    active_count: int
    idle_count: int
    working_count: int
    paused_count: int
    total_count: int
    max_agents: int


class AgentActionResponse(BaseModel):
    """Response for agent actions (stop, pause, resume)."""
    success: bool
    message: str


class StopAllResponse(BaseModel):
    """Response after stopping all agents."""
    stopped: int
    errors: List[str]


def get_project_dir(project_name: str) -> Path:
    """Get the project directory from the registry."""
    import sys
    sys.path.insert(0, str(ROOT_DIR))
    from registry import get_project_path

    project_path = get_project_path(project_name)
    if not project_path:
        raise HTTPException(status_code=404, detail=f"Project '{project_name}' not found")

    project_dir = Path(project_path)
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail=f"Project directory does not exist")

    return project_dir


@router.get("", response_model=PoolStatus)
async def get_pool_status(project_name: str):
    """Get the status of the agent pool for a project."""
    project_dir = get_project_dir(project_name)
    pool = get_pool_manager(project_name, project_dir, ROOT_DIR)
    return pool.get_pool_status()


@router.post("", response_model=SpawnAgentResponse)
async def spawn_agents(project_name: str, request: SpawnAgentsRequest):
    """Spawn new agents in the pool."""
    project_dir = get_project_dir(project_name)
    pool = get_pool_manager(project_name, project_dir, ROOT_DIR)

    agents, errors = await pool.spawn_agents(
        count=request.count,
        model=request.model,
        yolo_mode=request.yolo_mode,
    )

    return SpawnAgentResponse(
        spawned=len(agents),
        agents=[a.to_dict() for a in agents],
        errors=errors,
    )


@router.get("/{agent_id}", response_model=AgentInfo)
async def get_agent(project_name: str, agent_id: str):
    """Get information about a specific agent."""
    project_dir = get_project_dir(project_name)
    pool = get_pool_manager(project_name, project_dir, ROOT_DIR)

    agent = pool.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")

    return agent.to_dict()


@router.post("/{agent_id}/stop", response_model=AgentActionResponse)
async def stop_agent(project_name: str, agent_id: str):
    """Stop a specific agent."""
    project_dir = get_project_dir(project_name)
    pool = get_pool_manager(project_name, project_dir, ROOT_DIR)

    success, message = await pool.stop_agent(agent_id)
    if not success:
        raise HTTPException(status_code=400, detail=message)

    return AgentActionResponse(success=True, message=message)


@router.post("/{agent_id}/pause", response_model=AgentActionResponse)
async def pause_agent(project_name: str, agent_id: str):
    """Pause a specific agent."""
    project_dir = get_project_dir(project_name)
    pool = get_pool_manager(project_name, project_dir, ROOT_DIR)

    success, message = await pool.pause_agent(agent_id)
    if not success:
        raise HTTPException(status_code=400, detail=message)

    return AgentActionResponse(success=True, message=message)


@router.post("/{agent_id}/resume", response_model=AgentActionResponse)
async def resume_agent(project_name: str, agent_id: str):
    """Resume a paused agent."""
    project_dir = get_project_dir(project_name)
    pool = get_pool_manager(project_name, project_dir, ROOT_DIR)

    success, message = await pool.resume_agent(agent_id)
    if not success:
        raise HTTPException(status_code=400, detail=message)

    return AgentActionResponse(success=True, message=message)


@router.post("/stop-all", response_model=StopAllResponse)
async def stop_all_agents(project_name: str):
    """Stop all agents in the pool."""
    project_dir = get_project_dir(project_name)
    pool = get_pool_manager(project_name, project_dir, ROOT_DIR)

    stopped, errors = await pool.stop_all_agents()
    return StopAllResponse(stopped=stopped, errors=errors)


@router.get("/health", response_model=dict)
async def healthcheck_agents(project_name: str):
    """Check health of all agents in the pool."""
    project_dir = get_project_dir(project_name)
    pool = get_pool_manager(project_name, project_dir, ROOT_DIR)

    results = await pool.healthcheck_all()
    return {
        "agents": results,
        "all_healthy": all(results.values()) if results else True,
    }
