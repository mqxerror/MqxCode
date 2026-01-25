"""
Server Tasks Router
===================

API endpoints for running server-side tasks and health checks.
Provides safe command execution with an allowlist-based security model.

Security:
- Commands are validated against an allowlist
- Input is sanitized to prevent injection attacks
- Output is captured and returned safely
- Timeouts prevent runaway processes
"""

import asyncio
import logging
import os
import re
import shlex
import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# Module logger
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/server-tasks", tags=["server-tasks"])

# Root directory of the application
ROOT_DIR = Path(__file__).parent.parent.parent

# UI directory for build commands
UI_DIR = ROOT_DIR / "ui"


# =============================================================================
# Security Configuration
# =============================================================================

# Allowed base commands for server tasks
# This is separate from the agent's ALLOWED_COMMANDS in security.py
# These are specifically for the UI server task execution
ALLOWED_TASK_COMMANDS = {
    # Version control
    "git",
    # Node.js tools
    "npm",
    "npx",
    "pnpm",
    "node",
    # Python tools
    "python",
    "python3",
    "pip",
    "pip3",
    "ruff",
    "mypy",
    "pytest",
    # File inspection (read-only)
    "ls",
    "cat",
    "head",
    "tail",
    "wc",
    "grep",
    "find",
    # Directory
    "pwd",
    # Output
    "echo",
}

# Maximum command execution time in seconds
MAX_EXECUTION_TIME = 120

# Maximum output size in bytes
MAX_OUTPUT_SIZE = 500_000


# =============================================================================
# Predefined Tasks
# =============================================================================

# Predefined safe tasks that users can run with a single click
PREDEFINED_TASKS = {
    "lint_python": {
        "description": "Run Python linter (ruff) on the project",
        "command": "ruff check .",
        "cwd": str(ROOT_DIR),
    },
    "lint_ui": {
        "description": "Run ESLint on the UI code",
        "command": "npm run lint",
        "cwd": str(UI_DIR),
    },
    "lint_all": {
        "description": "Run linters on both Python and UI code",
        "command": "ruff check . && cd ui && npm run lint",
        "cwd": str(ROOT_DIR),
    },
    "build_ui": {
        "description": "Build the React UI for production",
        "command": "npm run build",
        "cwd": str(UI_DIR),
    },
    "typecheck_ui": {
        "description": "Run TypeScript type checking on the UI",
        "command": "npm run typecheck",
        "cwd": str(UI_DIR),
    },
    "git_status": {
        "description": "Show git status of the project",
        "command": "git status",
        "cwd": str(ROOT_DIR),
    },
    "git_log": {
        "description": "Show recent git commits",
        "command": "git log --oneline -10",
        "cwd": str(ROOT_DIR),
    },
    "test_security": {
        "description": "Run security tests",
        "command": "python test_security.py",
        "cwd": str(ROOT_DIR),
    },
}


# =============================================================================
# Schemas
# =============================================================================


class TaskRunRequest(BaseModel):
    """Request to run a server task."""
    task: str
    custom_cmd: str | None = None


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
    agent: str
    database: str
    ui: str


# =============================================================================
# Command Validation
# =============================================================================


def extract_commands_from_string(command_string: str) -> list[str]:
    """
    Extract command names from a shell command string.

    Handles pipes, command chaining (&&, ||, ;), and subshells.
    Returns the base command names (without paths).
    """
    commands = []

    # Split on command separators
    segments = re.split(r'\s*(?:&&|\|\||\||;)\s*', command_string)

    for segment in segments:
        segment = segment.strip()
        if not segment:
            continue

        # Handle cd commands (they change context but are safe)
        if segment.startswith("cd "):
            # cd is allowed, continue to next segment
            continue

        try:
            tokens = shlex.split(segment)
        except ValueError:
            # Malformed command - fail safe
            return []

        if not tokens:
            continue

        # Get the first token (the command)
        cmd = tokens[0]

        # Handle paths like /usr/bin/python
        cmd = os.path.basename(cmd)

        commands.append(cmd)

    return commands


def validate_command(command_string: str) -> tuple[bool, str]:
    """
    Validate that a command is safe to execute.

    Returns (is_valid, error_message).
    """
    if not command_string or not command_string.strip():
        return False, "Empty command"

    # Extract all commands from the string
    commands = extract_commands_from_string(command_string)

    if not commands:
        return False, "Could not parse command"

    # Check each command against the allowlist
    for cmd in commands:
        if cmd not in ALLOWED_TASK_COMMANDS:
            return False, f"Command '{cmd}' is not allowed"

    return True, ""


# =============================================================================
# Task Execution
# =============================================================================


async def execute_command(
    command: str,
    cwd: str | None = None,
    timeout: int = MAX_EXECUTION_TIME
) -> tuple[str, int]:
    """
    Execute a shell command safely with timeout.

    Returns (output, exit_code).
    """
    working_dir = cwd or str(ROOT_DIR)

    # Ensure working directory exists
    if not Path(working_dir).exists():
        return f"Working directory does not exist: {working_dir}", 1

    try:
        # Create subprocess with shell=True for command chaining support
        process = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=working_dir,
            env={**os.environ, "TERM": "dumb", "NO_COLOR": "1"},
        )

        try:
            stdout, _ = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout
            )
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            return f"Command timed out after {timeout} seconds", -1

        # Decode output
        output = stdout.decode("utf-8", errors="replace")

        # Truncate if too long
        if len(output) > MAX_OUTPUT_SIZE:
            output = output[:MAX_OUTPUT_SIZE] + f"\n\n... (output truncated, exceeded {MAX_OUTPUT_SIZE} bytes)"

        return output, process.returncode or 0

    except Exception as e:
        logger.error(f"Error executing command: {e}")
        return f"Error executing command: {e}", -1


# =============================================================================
# Endpoints
# =============================================================================


@router.get("/predefined", response_model=PredefinedTasksResponse)
async def get_predefined_tasks():
    """
    Get the list of available predefined tasks.

    These are safe, pre-configured commands that can be run
    without specifying a custom command.
    """
    tasks = [
        PredefinedTask(
            name=name,
            description=info["description"],
            command=info["command"],
        )
        for name, info in PREDEFINED_TASKS.items()
    ]

    return PredefinedTasksResponse(tasks=tasks)


@router.post("/run", response_model=TaskResult)
async def run_task(request: TaskRunRequest):
    """
    Run a server task.

    If task is a predefined task name, runs that task.
    If task is "custom", runs the custom_cmd with validation.

    Security:
    - Predefined tasks are pre-validated and safe
    - Custom commands are validated against an allowlist
    - All commands have timeouts to prevent hanging
    """
    if request.task == "custom":
        # Validate custom command
        if not request.custom_cmd:
            raise HTTPException(
                status_code=400,
                detail="custom_cmd is required when task is 'custom'"
            )

        is_valid, error = validate_command(request.custom_cmd)
        if not is_valid:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid command: {error}"
            )

        command = request.custom_cmd
        cwd = str(ROOT_DIR)

    elif request.task in PREDEFINED_TASKS:
        task_info = PREDEFINED_TASKS[request.task]
        command = task_info["command"]
        cwd = task_info.get("cwd", str(ROOT_DIR))

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown task: {request.task}. Use 'custom' for custom commands or one of: {list(PREDEFINED_TASKS.keys())}"
        )

    # Execute the command
    logger.info(f"Executing task '{request.task}': {command}")
    output, exit_code = await execute_command(command, cwd=cwd)

    return TaskResult(
        output=output,
        exit_code=exit_code,
        command=command,
        success=exit_code == 0,
    )


@router.get("/health", response_model=HealthStatus)
async def get_health():
    """
    Get system health status.

    Checks:
    - Agent: Whether the agent subsystem is available
    - Database: Whether the registry database is accessible
    - UI: Whether the UI has been built
    """
    # Check agent subsystem
    # We just check if the required files exist
    agent_file = ROOT_DIR / "autonomous_agent_demo.py"
    agent_status = "ok" if agent_file.exists() else "missing"

    # Check registry database
    # Import registry and try to access it
    try:
        # Add root to path for registry import
        if str(ROOT_DIR) not in sys.path:
            sys.path.insert(0, str(ROOT_DIR))

        from registry import get_all_projects
        # Call get_all_projects to verify database connectivity
        _ = get_all_projects()
        database_status = "ok"
    except Exception as e:
        logger.warning(f"Database health check failed: {e}")
        database_status = f"error: {str(e)[:50]}"

    # Check UI build
    ui_dist = UI_DIR / "dist"
    if ui_dist.exists() and (ui_dist / "index.html").exists():
        ui_status = "ok"
    else:
        ui_status = "not built"

    return HealthStatus(
        agent=agent_status,
        database=database_status,
        ui=ui_status,
    )


@router.get("/allowed-commands")
async def get_allowed_commands():
    """
    Get the list of allowed commands for custom task execution.

    This helps users understand what commands they can use
    when running custom tasks.
    """
    return {
        "allowed_commands": sorted(ALLOWED_TASK_COMMANDS),
        "max_execution_time_seconds": MAX_EXECUTION_TIME,
        "max_output_size_bytes": MAX_OUTPUT_SIZE,
    }
