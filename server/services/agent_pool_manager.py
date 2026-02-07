"""
Agent Pool Manager
==================

Manages a pool of agent subprocesses for parallel feature implementation.
Supports spawning multiple agents per project, each working on different features.
"""

import asyncio
import logging
import os
import re
import subprocess
import sys
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import Awaitable, Callable, Dict, Literal, Optional, Set

import psutil

# Add parent directories to path for shared module imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from api.database import Agent, create_database
from auth import AUTH_ERROR_HELP_SERVER as AUTH_ERROR_HELP
from auth import is_auth_error

logger = logging.getLogger(__name__)

# Patterns for sensitive data that should be redacted from output
SENSITIVE_PATTERNS = [
    r'sk-[a-zA-Z0-9]{20,}',
    r'ANTHROPIC_API_KEY=[^\s]+',
    r'api[_-]?key[=:][^\s]+',
    r'token[=:][^\s]+',
    r'password[=:][^\s]+',
    r'secret[=:][^\s]+',
    r'ghp_[a-zA-Z0-9]{36,}',
    r'gho_[a-zA-Z0-9]{36,}',
    r'ghs_[a-zA-Z0-9]{36,}',
    r'ghr_[a-zA-Z0-9]{36,}',
    r'aws[_-]?access[_-]?key[=:][^\s]+',
    r'aws[_-]?secret[=:][^\s]+',
]


def sanitize_output(line: str) -> str:
    """Remove sensitive information from output lines."""
    for pattern in SENSITIVE_PATTERNS:
        line = re.sub(pattern, '[REDACTED]', line, flags=re.IGNORECASE)
    return line


class AgentInstance:
    """
    Represents a single agent instance in the pool.

    Each agent runs in its own subprocess and works on one feature at a time.
    """

    def __init__(
        self,
        agent_id: str,
        project_name: str,
        project_dir: Path,
        root_dir: Path,
        model: str = "claude-opus-4-6",
        yolo_mode: bool = False,
    ):
        self.agent_id = agent_id
        self.project_name = project_name
        self.project_dir = project_dir
        self.root_dir = root_dir
        self.model = model
        self.yolo_mode = yolo_mode

        self.process: subprocess.Popen | None = None
        self._status: Literal["idle", "working", "paused", "stopped", "crashed"] = "stopped"
        self.started_at: datetime | None = None
        self.current_feature_id: int | None = None
        self._output_task: asyncio.Task | None = None

        # Callbacks for output and status changes
        self._output_callbacks: Set[Callable[[str, str], Awaitable[None]]] = set()
        self._status_callbacks: Set[Callable[[str, str], Awaitable[None]]] = set()
        self._callbacks_lock = threading.Lock()

        # Per-agent lock file
        self.agents_dir = self.project_dir / ".agents"
        self.lock_file = self.agents_dir / f"{self.agent_id}.lock"

    @property
    def status(self) -> Literal["idle", "working", "paused", "stopped", "crashed"]:
        return self._status

    @status.setter
    def status(self, value: Literal["idle", "working", "paused", "stopped", "crashed"]):
        old_status = self._status
        self._status = value
        if old_status != value:
            self._notify_status_change(value)

    def _notify_status_change(self, status: str) -> None:
        """Notify all registered callbacks of status change."""
        with self._callbacks_lock:
            callbacks = list(self._status_callbacks)

        for callback in callbacks:
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(self._safe_callback(callback, self.agent_id, status))
            except RuntimeError:
                pass

    async def _safe_callback(self, callback: Callable, *args) -> None:
        """Safely execute a callback, catching and logging any errors."""
        try:
            await callback(*args)
        except Exception as e:
            logger.warning(f"Callback error: {e}")

    def add_output_callback(self, callback: Callable[[str, str], Awaitable[None]]) -> None:
        """Add a callback for output lines. Callback receives (agent_id, line)."""
        with self._callbacks_lock:
            self._output_callbacks.add(callback)

    def remove_output_callback(self, callback: Callable[[str, str], Awaitable[None]]) -> None:
        """Remove an output callback."""
        with self._callbacks_lock:
            self._output_callbacks.discard(callback)

    def add_status_callback(self, callback: Callable[[str, str], Awaitable[None]]) -> None:
        """Add a callback for status changes. Callback receives (agent_id, status)."""
        with self._callbacks_lock:
            self._status_callbacks.add(callback)

    def remove_status_callback(self, callback: Callable[[str, str], Awaitable[None]]) -> None:
        """Remove a status callback."""
        with self._callbacks_lock:
            self._status_callbacks.discard(callback)

    @property
    def pid(self) -> int | None:
        return self.process.pid if self.process else None

    def _create_lock(self) -> None:
        """Create per-agent lock file."""
        self.agents_dir.mkdir(parents=True, exist_ok=True)
        if self.process:
            self.lock_file.write_text(str(self.process.pid))

    def _remove_lock(self) -> None:
        """Remove per-agent lock file."""
        self.lock_file.unlink(missing_ok=True)

    async def _broadcast_output(self, line: str) -> None:
        """Broadcast output line to all registered callbacks."""
        with self._callbacks_lock:
            callbacks = list(self._output_callbacks)

        for callback in callbacks:
            await self._safe_callback(callback, self.agent_id, line)

    async def _stream_output(self) -> None:
        """Stream process output to callbacks."""
        if not self.process or not self.process.stdout:
            return

        auth_error_detected = False
        output_buffer = []

        try:
            loop = asyncio.get_running_loop()
            while True:
                line = await loop.run_in_executor(
                    None, self.process.stdout.readline
                )
                if not line:
                    break

                decoded = line.decode("utf-8", errors="replace").rstrip()
                sanitized = sanitize_output(decoded)

                output_buffer.append(decoded)
                if len(output_buffer) > 20:
                    output_buffer.pop(0)

                if not auth_error_detected and is_auth_error(decoded):
                    auth_error_detected = True
                    for help_line in AUTH_ERROR_HELP.strip().split('\n'):
                        await self._broadcast_output(help_line)

                await self._broadcast_output(sanitized)

        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.warning(f"Output streaming error for agent {self.agent_id}: {e}")
        finally:
            if self.process and self.process.poll() is not None:
                exit_code = self.process.returncode
                if exit_code != 0 and self.status in ("idle", "working"):
                    if not auth_error_detected:
                        combined_output = '\n'.join(output_buffer)
                        if is_auth_error(combined_output):
                            for help_line in AUTH_ERROR_HELP.strip().split('\n'):
                                await self._broadcast_output(help_line)
                    self.status = "crashed"
                elif self.status in ("idle", "working"):
                    self.status = "stopped"
                self._remove_lock()

    async def start(self) -> tuple[bool, str]:
        """
        Start the agent subprocess.

        Returns:
            Tuple of (success, message)
        """
        if self.status in ("idle", "working", "paused"):
            return False, f"Agent {self.agent_id} is already {self.status}"

        # Build command with agent ID for multi-agent mode
        cmd = [
            sys.executable,
            str(self.root_dir / "autonomous_agent_demo.py"),
            "--project-dir",
            str(self.project_dir.resolve()),
            "--model",
            self.model,
        ]

        if self.yolo_mode:
            cmd.append("--yolo")

        # Set environment with agent ID
        env = os.environ.copy()
        env["AGENT_ID"] = self.agent_id

        try:
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                cwd=str(self.project_dir),
                env=env,
            )

            self._create_lock()
            self.started_at = datetime.now()
            self.status = "idle"

            self._output_task = asyncio.create_task(self._stream_output())

            return True, f"Agent {self.agent_id} started with PID {self.process.pid}"
        except Exception as e:
            logger.exception(f"Failed to start agent {self.agent_id}")
            return False, f"Failed to start agent: {e}"

    async def stop(self) -> tuple[bool, str]:
        """
        Stop the agent subprocess.

        Returns:
            Tuple of (success, message)
        """
        if not self.process or self.status == "stopped":
            return False, f"Agent {self.agent_id} is not running"

        try:
            if self._output_task:
                self._output_task.cancel()
                try:
                    await self._output_task
                except asyncio.CancelledError:
                    pass

            self.process.terminate()

            loop = asyncio.get_running_loop()
            try:
                await asyncio.wait_for(
                    loop.run_in_executor(None, self.process.wait),
                    timeout=5.0
                )
            except asyncio.TimeoutError:
                self.process.kill()
                await loop.run_in_executor(None, self.process.wait)

            self._remove_lock()
            self.status = "stopped"
            self.process = None
            self.started_at = None
            self.current_feature_id = None

            return True, f"Agent {self.agent_id} stopped"
        except Exception as e:
            logger.exception(f"Failed to stop agent {self.agent_id}")
            return False, f"Failed to stop agent: {e}"

    async def pause(self) -> tuple[bool, str]:
        """Pause the agent using psutil."""
        if not self.process or self.status not in ("idle", "working"):
            return False, f"Agent {self.agent_id} is not running"

        try:
            proc = psutil.Process(self.process.pid)
            proc.suspend()
            self.status = "paused"
            return True, f"Agent {self.agent_id} paused"
        except psutil.NoSuchProcess:
            self.status = "crashed"
            self._remove_lock()
            return False, f"Agent {self.agent_id} process no longer exists"
        except Exception as e:
            logger.exception(f"Failed to pause agent {self.agent_id}")
            return False, f"Failed to pause agent: {e}"

    async def resume(self) -> tuple[bool, str]:
        """Resume a paused agent."""
        if not self.process or self.status != "paused":
            return False, f"Agent {self.agent_id} is not paused"

        try:
            proc = psutil.Process(self.process.pid)
            proc.resume()
            self.status = "idle"  # Will become "working" when it claims a feature
            return True, f"Agent {self.agent_id} resumed"
        except psutil.NoSuchProcess:
            self.status = "crashed"
            self._remove_lock()
            return False, f"Agent {self.agent_id} process no longer exists"
        except Exception as e:
            logger.exception(f"Failed to resume agent {self.agent_id}")
            return False, f"Failed to resume agent: {e}"

    async def healthcheck(self) -> bool:
        """Check if the agent process is still alive."""
        if not self.process:
            return self.status == "stopped"

        poll = self.process.poll()
        if poll is not None:
            if self.status in ("idle", "working", "paused"):
                self.status = "crashed"
                self._remove_lock()
            return False

        return True

    def to_dict(self) -> dict:
        """Get current status as a dictionary."""
        return {
            "agent_id": self.agent_id,
            "status": self.status,
            "pid": self.pid,
            "model": self.model,
            "yolo_mode": self.yolo_mode,
            "current_feature_id": self.current_feature_id,
            "started_at": self.started_at.isoformat() if self.started_at else None,
        }


class AgentPoolManager:
    """
    Manages a pool of agents for a project.

    Supports spawning multiple agents, coordinating work distribution,
    and monitoring agent health.
    """

    def __init__(
        self,
        project_name: str,
        project_dir: Path,
        root_dir: Path,
        max_agents: int = 10,
    ):
        self.project_name = project_name
        self.project_dir = project_dir
        self.root_dir = root_dir
        self.max_agents = max_agents

        self.agents: Dict[str, AgentInstance] = {}
        self._lock = threading.Lock()

        # Database session for agent registration
        self._engine, self._session_maker = create_database(project_dir)

        # Pool-level callbacks
        self._pool_callbacks: Set[Callable[[dict], Awaitable[None]]] = set()
        self._callbacks_lock = threading.Lock()

    def add_pool_callback(self, callback: Callable[[dict], Awaitable[None]]) -> None:
        """Add a callback for pool status updates."""
        with self._callbacks_lock:
            self._pool_callbacks.add(callback)

    def remove_pool_callback(self, callback: Callable[[dict], Awaitable[None]]) -> None:
        """Remove a pool callback."""
        with self._callbacks_lock:
            self._pool_callbacks.discard(callback)

    async def _notify_pool_change(self) -> None:
        """Notify all callbacks of pool status change."""
        status = self.get_pool_status()
        with self._callbacks_lock:
            callbacks = list(self._pool_callbacks)

        for callback in callbacks:
            try:
                await callback(status)
            except Exception as e:
                logger.warning(f"Pool callback error: {e}")

    def _generate_agent_id(self) -> str:
        """Generate a unique agent ID."""
        return str(uuid.uuid4())[:8]

    def _register_agent_db(self, agent: AgentInstance) -> None:
        """Register agent in database."""
        session = self._session_maker()
        try:
            db_agent = Agent(
                agent_id=agent.agent_id,
                project_name=self.project_name,
                status=agent.status,
                model=agent.model,
                yolo_mode=agent.yolo_mode,
                pid=agent.pid,
                created_at=datetime.utcnow(),
                started_at=agent.started_at,
            )
            session.add(db_agent)
            session.commit()
        except Exception as e:
            session.rollback()
            logger.warning(f"Failed to register agent in DB: {e}")
        finally:
            session.close()

    def _update_agent_db(self, agent_id: str, **updates) -> None:
        """Update agent record in database."""
        session = self._session_maker()
        try:
            db_agent = session.query(Agent).filter(Agent.agent_id == agent_id).first()
            if db_agent:
                for key, value in updates.items():
                    if hasattr(db_agent, key):
                        setattr(db_agent, key, value)
                db_agent.last_heartbeat = datetime.utcnow()
                session.commit()
        except Exception as e:
            session.rollback()
            logger.warning(f"Failed to update agent in DB: {e}")
        finally:
            session.close()

    def _remove_agent_db(self, agent_id: str) -> None:
        """Remove agent record from database."""
        session = self._session_maker()
        try:
            db_agent = session.query(Agent).filter(Agent.agent_id == agent_id).first()
            if db_agent:
                session.delete(db_agent)
                session.commit()
        except Exception as e:
            session.rollback()
            logger.warning(f"Failed to remove agent from DB: {e}")
        finally:
            session.close()

    async def spawn_agent(
        self,
        model: str = "claude-opus-4-6",
        yolo_mode: bool = False,
        name: Optional[str] = None,
    ) -> tuple[Optional[AgentInstance], str]:
        """
        Spawn a new agent in the pool.

        Args:
            model: Model to use for this agent
            yolo_mode: Whether to run in YOLO mode
            name: Optional human-readable name for the agent

        Returns:
            Tuple of (AgentInstance or None, message)
        """
        with self._lock:
            if len(self.agents) >= self.max_agents:
                return None, f"Maximum agents ({self.max_agents}) reached"

            agent_id = self._generate_agent_id()
            agent = AgentInstance(
                agent_id=agent_id,
                project_name=self.project_name,
                project_dir=self.project_dir,
                root_dir=self.root_dir,
                model=model,
                yolo_mode=yolo_mode,
            )

            self.agents[agent_id] = agent

        # Start the agent
        success, message = await agent.start()
        if not success:
            with self._lock:
                del self.agents[agent_id]
            return None, message

        # Register in database
        self._register_agent_db(agent)

        # Set up status callback to update DB
        async def on_status_change(aid: str, status: str):
            self._update_agent_db(aid, status=status)
            await self._notify_pool_change()

        agent.add_status_callback(on_status_change)

        await self._notify_pool_change()
        return agent, message

    async def spawn_agents(
        self,
        count: int,
        model: str = "claude-opus-4-6",
        yolo_mode: bool = False,
    ) -> tuple[list[AgentInstance], list[str]]:
        """
        Spawn multiple agents at once.

        Args:
            count: Number of agents to spawn
            model: Model to use for all agents
            yolo_mode: Whether to run in YOLO mode

        Returns:
            Tuple of (list of created agents, list of error messages)
        """
        agents = []
        errors = []

        for i in range(count):
            agent, message = await self.spawn_agent(model=model, yolo_mode=yolo_mode)
            if agent:
                agents.append(agent)
            else:
                errors.append(message)

        return agents, errors

    async def stop_agent(self, agent_id: str) -> tuple[bool, str]:
        """Stop a specific agent."""
        with self._lock:
            agent = self.agents.get(agent_id)

        if not agent:
            return False, f"Agent {agent_id} not found"

        success, message = await agent.stop()
        if success:
            with self._lock:
                del self.agents[agent_id]
            self._remove_agent_db(agent_id)
            await self._notify_pool_change()

        return success, message

    async def stop_all_agents(self) -> tuple[int, list[str]]:
        """Stop all agents in the pool."""
        with self._lock:
            agent_ids = list(self.agents.keys())

        stopped = 0
        errors = []

        for agent_id in agent_ids:
            success, message = await self.stop_agent(agent_id)
            if success:
                stopped += 1
            else:
                errors.append(message)

        return stopped, errors

    async def pause_agent(self, agent_id: str) -> tuple[bool, str]:
        """Pause a specific agent."""
        with self._lock:
            agent = self.agents.get(agent_id)

        if not agent:
            return False, f"Agent {agent_id} not found"

        success, message = await agent.pause()
        if success:
            self._update_agent_db(agent_id, status="paused")
            await self._notify_pool_change()

        return success, message

    async def resume_agent(self, agent_id: str) -> tuple[bool, str]:
        """Resume a paused agent."""
        with self._lock:
            agent = self.agents.get(agent_id)

        if not agent:
            return False, f"Agent {agent_id} not found"

        success, message = await agent.resume()
        if success:
            self._update_agent_db(agent_id, status="idle")
            await self._notify_pool_change()

        return success, message

    def get_agent(self, agent_id: str) -> Optional[AgentInstance]:
        """Get an agent by ID."""
        with self._lock:
            return self.agents.get(agent_id)

    def get_all_agents(self) -> list[AgentInstance]:
        """Get all agents in the pool."""
        with self._lock:
            return list(self.agents.values())

    async def healthcheck_all(self) -> dict:
        """Check health of all agents."""
        with self._lock:
            agents = list(self.agents.items())

        results = {}
        crashed = []

        for agent_id, agent in agents:
            healthy = await agent.healthcheck()
            results[agent_id] = healthy
            if not healthy and agent.status == "crashed":
                crashed.append(agent_id)

        # Clean up crashed agents
        for agent_id in crashed:
            with self._lock:
                if agent_id in self.agents:
                    del self.agents[agent_id]
            self._update_agent_db(agent_id, status="crashed")

        if crashed:
            await self._notify_pool_change()

        return results

    def get_pool_status(self) -> dict:
        """Get overall pool status."""
        with self._lock:
            agents = list(self.agents.values())

        active = sum(1 for a in agents if a.status in ("idle", "working"))
        idle = sum(1 for a in agents if a.status == "idle")
        working = sum(1 for a in agents if a.status == "working")
        paused = sum(1 for a in agents if a.status == "paused")

        return {
            "project_name": self.project_name,
            "agents": [a.to_dict() for a in agents],
            "active_count": active,
            "idle_count": idle,
            "working_count": working,
            "paused_count": paused,
            "total_count": len(agents),
            "max_agents": self.max_agents,
        }


# Global registry of pool managers per project
_pool_managers: Dict[str, AgentPoolManager] = {}
_pool_managers_lock = threading.Lock()


def get_pool_manager(
    project_name: str,
    project_dir: Path,
    root_dir: Path,
    max_agents: int = 10,
) -> AgentPoolManager:
    """Get or create a pool manager for a project."""
    with _pool_managers_lock:
        if project_name not in _pool_managers:
            _pool_managers[project_name] = AgentPoolManager(
                project_name, project_dir, root_dir, max_agents
            )
        return _pool_managers[project_name]


async def cleanup_all_pools() -> None:
    """Stop all agents in all pools. Called on server shutdown."""
    with _pool_managers_lock:
        managers = list(_pool_managers.values())

    for manager in managers:
        try:
            await manager.stop_all_agents()
        except Exception as e:
            logger.warning(f"Error stopping pool for {manager.project_name}: {e}")

    with _pool_managers_lock:
        _pool_managers.clear()


def cleanup_orphaned_agent_locks() -> int:
    """
    Clean up orphaned agent lock files from previous runs.

    Returns:
        Number of orphaned lock files cleaned up
    """
    from registry import list_registered_projects

    cleaned = 0
    try:
        projects = list_registered_projects()
        for name, info in projects.items():
            project_path = Path(info.get("path", ""))
            if not project_path.exists():
                continue

            agents_dir = project_path / ".agents"
            if not agents_dir.exists():
                continue

            for lock_file in agents_dir.glob("*.lock"):
                try:
                    pid_str = lock_file.read_text().strip()
                    pid = int(pid_str)

                    if psutil.pid_exists(pid):
                        try:
                            proc = psutil.Process(pid)
                            cmdline = " ".join(proc.cmdline())
                            if "autonomous_agent_demo.py" in cmdline:
                                continue  # Still running
                        except (psutil.NoSuchProcess, psutil.AccessDenied):
                            pass

                    lock_file.unlink(missing_ok=True)
                    cleaned += 1
                    logger.info(f"Removed orphaned agent lock: {lock_file}")

                except (ValueError, OSError) as e:
                    logger.warning(f"Removing invalid lock file {lock_file}: {e}")
                    lock_file.unlink(missing_ok=True)
                    cleaned += 1

    except Exception as e:
        logger.error(f"Error during agent lock cleanup: {e}")

    if cleaned:
        logger.info(f"Cleaned up {cleaned} orphaned agent lock file(s)")

    return cleaned
