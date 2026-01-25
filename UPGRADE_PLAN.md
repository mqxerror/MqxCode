# MqxCode Harness SaaS Upgrade Plan
## Leveraging New Anthropic Features for Parallel Agent Execution

---

## Executive Summary

This plan outlines how to upgrade the MqxCode autonomous coding agent system to support:
1. **Parallel agent execution** - Run multiple agents per project simultaneously
2. **Task dependencies** - Features can depend on other features
3. **Agent orchestration** - Coordinate work distribution across agents
4. **New Claude SDK features** - Leverage SDK MCP servers, session forking, extended thinking

---

## Phase 1: Database Schema Upgrades (Priority: Critical)

### 1.1 Feature Dependencies Table
```python
class FeatureDependency(Base):
    __tablename__ = "feature_dependencies"

    id = Column(Integer, primary_key=True)
    feature_id = Column(Integer, ForeignKey("features.id"), index=True)
    depends_on_id = Column(Integer, ForeignKey("features.id"), index=True)
    dependency_type = Column(String(50))  # "blocks", "requires", "related"
    created_at = Column(DateTime, default=datetime.utcnow)
```

### 1.2 Agent Pool Table
```python
class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True)
    agent_id = Column(String(100), unique=True, index=True)  # UUID
    project_name = Column(String(100), index=True)
    status = Column(String(20))  # "idle", "working", "paused", "crashed"
    current_feature_id = Column(Integer, ForeignKey("features.id"))
    model = Column(String(100))
    pid = Column(Integer)
    started_at = Column(DateTime)
    last_heartbeat = Column(DateTime)
```

### 1.3 Task Runs History
```python
class TaskRun(Base):
    __tablename__ = "task_runs"

    id = Column(Integer, primary_key=True)
    feature_id = Column(Integer, ForeignKey("features.id"), index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"))
    status = Column(String(20))  # "running", "completed", "failed"
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    passed = Column(Boolean)
    error_message = Column(Text)
```

### 1.4 Enhanced Feature Model
```python
# Add to existing Feature model:
assigned_to_agent_id = Column(Integer, ForeignKey("agents.id"))
created_at = Column(DateTime, default=datetime.utcnow)
updated_at = Column(DateTime, onupdate=datetime.utcnow)
attempt_count = Column(Integer, default=0)
```

**Files to modify:**
- `api/database.py` - Add new models
- `api/migration.py` - Add migration functions

---

## Phase 2: Agent Pool Management (Priority: Critical)

### 2.1 Replace Single-Agent Lock with Agent Pool

**Current:** `.agent.lock` file prevents multiple agents
**New:** Per-agent lock files in `.agents/` directory

```python
# server/services/agent_pool_manager.py

class AgentPoolManager:
    """Manages a pool of agents for a project."""

    def __init__(self, project_name: str, project_dir: Path):
        self.project_name = project_name
        self.project_dir = project_dir
        self.agents: dict[str, AgentInstance] = {}
        self.max_agents = 10

    async def spawn_agent(self, model: str, yolo_mode: bool = False) -> AgentInstance:
        """Spawn a new agent in the pool."""
        agent_id = str(uuid.uuid4())[:8]
        # Create per-agent lock file
        # Start subprocess
        # Register callbacks
        return agent_instance

    async def claim_feature(self, agent_id: str) -> Optional[Feature]:
        """Atomically claim next available feature for an agent."""
        # Check dependencies are satisfied
        # Lock feature for agent
        # Return feature or None

    async def release_feature(self, agent_id: str, feature_id: int):
        """Release a feature lock."""
```

### 2.2 Feature Claiming with Dependencies

```python
# mcp_server/feature_mcp.py - New tools

@mcp.tool()
def feature_claim(agent_id: str) -> str:
    """Atomically claim next available feature.

    Checks:
    1. Feature has no unmet dependencies
    2. Feature is not claimed by another agent
    3. Feature is not already passing
    """
    with _db_lock:
        # Find features with all dependencies satisfied
        available = get_features_with_satisfied_deps()
        for feature in available:
            if try_claim(feature.id, agent_id):
                return json.dumps({"claimed": feature.id})
        return json.dumps({"claimed": None, "reason": "no available features"})

@mcp.tool()
def feature_get_dependencies(feature_id: int) -> str:
    """Get features that must be completed before this one."""

@mcp.tool()
def feature_add_dependency(feature_id: int, depends_on_id: int) -> str:
    """Add a dependency relationship."""
```

**Files to create:**
- `server/services/agent_pool_manager.py`

**Files to modify:**
- `mcp_server/feature_mcp.py` - Add dependency-aware tools
- `agent.py` - Pass agent_id to all feature operations

---

## Phase 3: New SDK Features Integration (Priority: High)

### 3.1 SDK MCP Server (In-Process Tools)

Replace external MCP subprocess with in-process SDK MCP:

```python
# client.py - Updated

from claude_agent_sdk import create_sdk_mcp_server, tool

@tool()
def feature_get_next(agent_id: str) -> str:
    """Get next available feature for this agent."""
    # Direct database access, no IPC overhead
    pass

def create_client(project_dir, model, yolo_mode, agent_id):
    sdk_mcp = create_sdk_mcp_server([
        feature_get_next,
        feature_mark_passing,
        feature_claim,
        # ... other tools
    ])

    return ClaudeSDKClient(
        options=ClaudeAgentOptions(
            mcp_servers={"features": sdk_mcp},  # In-process!
            # ... other options
        )
    )
```

### 3.2 Extended Thinking for Complex Features

```python
# client.py

options = ClaudeAgentOptions(
    max_thinking_tokens=8000,  # Deep reasoning for complex tasks
    # ...
)
```

### 3.3 Session Forking for Parallel Exploration

```python
# agent.py - New capability

async def try_multiple_approaches(client, feature):
    """Fork session to try different implementation approaches."""

    # Fork 1: Conservative approach
    fork1 = await client.fork_session()
    result1 = await fork1.query("Implement conservatively...")

    # Fork 2: Aggressive optimization
    fork2 = await client.fork_session()
    result2 = await fork2.query("Implement with optimizations...")

    # Choose best result
    return choose_best(result1, result2)
```

### 3.4 File Checkpointing for Safe Experimentation

```python
options = ClaudeAgentOptions(
    enable_file_checkpointing=True,
)

# In agent.py
async def implement_with_rollback(client, feature):
    checkpoint_id = await client.create_checkpoint()
    try:
        await client.query(f"Implement feature: {feature.name}")
        if not await run_tests():
            await client.rewind_files(checkpoint_id)
            raise ImplementationFailed()
    except:
        await client.rewind_files(checkpoint_id)
        raise
```

### 3.5 Dynamic Model Switching

```python
async def run_agent_session(client, feature):
    # Start with fast model for analysis
    await client.set_model('claude-haiku-4-5')
    analysis = await client.query("Analyze this feature...")

    # Switch to powerful model for implementation
    if analysis.complexity == 'high':
        await client.set_model('claude-opus-4-5')
    else:
        await client.set_model('claude-sonnet-4-5')

    await client.query("Implement the feature...")
```

---

## Phase 4: API Layer Updates (Priority: High)

### 4.1 Agent Pool REST Endpoints

```python
# server/routers/agent_pool.py

@router.get("/api/projects/{project_name}/agents")
async def list_agents(project_name: str) -> AgentPoolStatus:
    """List all agents in the pool."""

@router.post("/api/projects/{project_name}/agents")
async def start_agents(
    project_name: str,
    count: int = 1,
    model: str = "claude-sonnet-4-5",
    yolo_mode: bool = False
) -> AgentStartResponse:
    """Start multiple agents."""

@router.post("/api/projects/{project_name}/agents/{agent_id}/stop")
async def stop_agent(project_name: str, agent_id: str):
    """Stop a specific agent."""

@router.get("/api/projects/{project_name}/agents/{agent_id}/logs")
async def get_agent_logs(project_name: str, agent_id: str):
    """Get logs for a specific agent."""
```

### 4.2 Dependency Management Endpoints

```python
# server/routers/dependencies.py

@router.get("/api/projects/{project_name}/dependencies")
async def get_dependency_graph(project_name: str):
    """Get the full dependency graph."""

@router.post("/api/projects/{project_name}/features/{feature_id}/dependencies")
async def add_dependency(feature_id: int, depends_on: List[int]):
    """Add dependencies to a feature."""

@router.delete("/api/projects/{project_name}/features/{feature_id}/dependencies/{dep_id}")
async def remove_dependency(feature_id: int, dep_id: int):
    """Remove a dependency."""
```

### 4.3 WebSocket Protocol Updates

```python
# server/websocket.py - New message types

# Per-agent logs
{"type": "agent_log", "agent_id": "abc123", "line": "...", "timestamp": "..."}

# Agent status changes
{"type": "agent_status", "agent_id": "abc123", "status": "working", "feature_id": 42}

# Pool status
{"type": "agent_pool", "agents": [...], "active": 3, "idle": 2}

# Dependency updates
{"type": "dependency_resolved", "feature_id": 42, "unblocked": [43, 44]}
```

---

## Phase 5: UI Enhancements (Priority: Medium)

### 5.1 Agent Pool Dashboard

```tsx
// ui/src/components/AgentPoolDashboard.tsx

export function AgentPoolDashboard({ projectName }: Props) {
  const { agents, activeCount } = useAgentPool(projectName)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Pool stats */}
      <StatCard title="Active Agents" value={activeCount} />
      <StatCard title="Features/Hour" value={featuresPerHour} />

      {/* Agent cards */}
      {agents.map(agent => (
        <AgentCard
          key={agent.id}
          agent={agent}
          onPause={() => pauseAgent(agent.id)}
          onResume={() => resumeAgent(agent.id)}
          onStop={() => stopAgent(agent.id)}
        />
      ))}
    </div>
  )
}
```

### 5.2 Kanban with Agent Swimlanes

```tsx
// ui/src/components/KanbanBoard.tsx - Enhanced

// Add agent swimlanes in "In Progress" column
<KanbanColumn title="In Progress">
  {agents.map(agent => (
    <AgentSwimlane key={agent.id} agent={agent}>
      {featuresForAgent(agent.id).map(feature => (
        <FeatureCard feature={feature} />
      ))}
    </AgentSwimlane>
  ))}
</KanbanColumn>
```

### 5.3 Dependency Graph Visualization

```tsx
// ui/src/components/DependencyGraph.tsx

import ReactFlow from 'reactflow'

export function DependencyGraph({ features, dependencies }: Props) {
  const nodes = features.map(f => ({
    id: String(f.id),
    data: { label: f.name, status: f.passes ? 'done' : 'pending' },
    position: calculatePosition(f),
  }))

  const edges = dependencies.map(d => ({
    id: `${d.feature_id}-${d.depends_on_id}`,
    source: String(d.depends_on_id),
    target: String(d.feature_id),
  }))

  return <ReactFlow nodes={nodes} edges={edges} />
}
```

### 5.4 Per-Agent Log Viewer

```tsx
// ui/src/components/agent-console/AgentLogTabs.tsx

export function AgentLogTabs({ agents }: Props) {
  const [selectedAgent, setSelectedAgent] = useState(agents[0]?.id)

  return (
    <div>
      <Tabs value={selectedAgent} onValueChange={setSelectedAgent}>
        <TabsList>
          <TabsTrigger value="all">All Agents</TabsTrigger>
          {agents.map(a => (
            <TabsTrigger key={a.id} value={a.id}>
              Agent {a.id.slice(0, 4)}
              <StatusDot status={a.status} />
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <LogViewer agentId={selectedAgent} />
    </div>
  )
}
```

---

## Phase 6: New TypeScript Types

```typescript
// ui/src/lib/types.ts - Additions

export interface AgentInfo {
  id: string
  status: 'idle' | 'working' | 'paused' | 'crashed'
  feature_id: number | null
  model: string
  started_at: string | null
  features_completed: number
}

export interface AgentPoolStatus {
  agents: AgentInfo[]
  active_count: number
  idle_count: number
  total_capacity: number
}

export interface FeatureDependency {
  feature_id: number
  depends_on_id: number
  dependency_type: 'blocks' | 'requires' | 'related'
}

export interface DependencyGraph {
  features: Feature[]
  dependencies: FeatureDependency[]
  blocked_features: number[]
  ready_features: number[]
}

// Enhanced Feature
export interface Feature {
  // ... existing fields
  assigned_to_agent_id?: string
  depends_on?: number[]
  blocks?: number[]
  attempt_count: number
  created_at: string
}

// New WebSocket messages
export type WSMessage =
  | { type: 'agent_log'; agent_id: string; line: string; timestamp: string }
  | { type: 'agent_status'; agent_id: string; status: string; feature_id?: number }
  | { type: 'agent_pool'; agents: AgentInfo[]; active: number }
  | { type: 'dependency_resolved'; feature_id: number; unblocked: number[] }
  | /* ... existing types */
```

---

## Implementation Timeline

| Phase | Components | Effort | Priority |
|-------|------------|--------|----------|
| 1 | Database Schema | 1 day | Critical |
| 2 | Agent Pool Manager | 2 days | Critical |
| 3 | SDK Features Integration | 2 days | High |
| 4 | API Layer Updates | 1 day | High |
| 5 | UI Enhancements | 2 days | Medium |
| 6 | TypeScript Types | 0.5 day | Medium |

**Total estimated effort: 8-9 days**

---

## Migration Strategy

### Step 1: Database Migration
```bash
# Add new tables without breaking existing functionality
python -c "from api.migration import run_migrations; run_migrations()"
```

### Step 2: Feature Flag Rollout
```python
# config.py
ENABLE_MULTI_AGENT = os.getenv("ENABLE_MULTI_AGENT", "false") == "true"
ENABLE_DEPENDENCIES = os.getenv("ENABLE_DEPENDENCIES", "false") == "true"
```

### Step 3: Gradual Rollout
1. Deploy database changes (backward compatible)
2. Deploy backend with feature flags OFF
3. Enable ENABLE_DEPENDENCIES first (lower risk)
4. Test with 2 agents, then scale to 5, then 10
5. Enable full ENABLE_MULTI_AGENT

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Race conditions in feature claiming | Use database transactions + row-level locking |
| Agent crashes leaving features stuck | Heartbeat monitoring + auto-release after timeout |
| Circular dependencies | Validate DAG on dependency creation |
| Resource exhaustion with many agents | Configurable max_agents limit per project |
| Conflicting file edits | Use file checkpointing + conflict detection |

---

## Success Metrics

- **Throughput**: Features completed per hour (target: 3x improvement)
- **Utilization**: Agent idle time percentage (target: <20%)
- **Reliability**: Successful feature completions (target: >95%)
- **Latency**: Time from feature start to completion (target: no regression)

---

## Next Steps

1. [ ] Review and approve this plan
2. [ ] Create feature branch: `feature/multi-agent-support`
3. [ ] Implement Phase 1 (Database)
4. [ ] Implement Phase 2 (Agent Pool)
5. [ ] Integration testing with 2 agents
6. [ ] Implement remaining phases
7. [ ] Load testing with 10 agents
8. [ ] Documentation and training

