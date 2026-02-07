/**
 * Agent Pool Dashboard
 *
 * Displays and controls multiple agents running in parallel.
 * Shows agent status, current feature, and provides controls for each agent.
 */

import { useState, useCallback, useEffect } from 'react'
import {
  Play,
  Square,
  Pause,
  RefreshCw,
  Plus,
  Cpu,
  Zap,
  AlertCircle,
  Users,
} from 'lucide-react'
import type { AgentPoolStatus, AgentInfo, AgentInstanceStatus } from '../lib/types'
import {
  getAgentPoolStatus,
  spawnAgents,
  stopPoolAgent,
  pausePoolAgent,
  resumePoolAgent,
  stopAllAgents,
} from '../lib/api'

interface AgentPoolDashboardProps {
  projectName: string
  onAgentSelect?: (agentId: string) => void
  selectedAgentId?: string | null
}

const STATUS_COLORS: Record<AgentInstanceStatus, string> = {
  idle: 'var(--color-warning)',
  working: 'var(--color-success)',
  paused: 'var(--color-text-secondary)',
  stopped: 'var(--color-text-tertiary)',
  crashed: 'var(--color-danger)',
}

const STATUS_LABELS: Record<AgentInstanceStatus, string> = {
  idle: 'Idle',
  working: 'Working',
  paused: 'Paused',
  stopped: 'Stopped',
  crashed: 'Crashed',
}

function AgentCard({
  agent,
  isSelected,
  onSelect,
  onStop,
  onPause,
  onResume,
}: {
  agent: AgentInfo
  isSelected: boolean
  onSelect: () => void
  onStop: () => void
  onPause: () => void
  onResume: () => void
}) {
  const isActive = agent.status === 'idle' || agent.status === 'working'

  return (
    <div
      className={`card p-4 cursor-pointer transition-all ${
        isSelected
          ? 'ring-2 ring-[var(--color-accent)] border-[var(--color-accent)]'
          : 'hover:border-[var(--color-accent)]'
      }`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-[var(--color-accent)]" />
          <span className="font-mono text-sm font-bold">
            {agent.agent_id.slice(0, 8)}
          </span>
        </div>
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold"
          style={{
            backgroundColor: `${STATUS_COLORS[agent.status]}20`,
            color: STATUS_COLORS[agent.status],
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: STATUS_COLORS[agent.status] }}
          />
          {STATUS_LABELS[agent.status]}
        </div>
      </div>

      {/* Model & Mode */}
      <div className="flex items-center gap-2 mb-2 text-xs text-[var(--color-text-secondary)]">
        <span className="font-mono">{agent.model.split('-').slice(-2).join('-')}</span>
        {agent.yolo_mode && (
          <span className="flex items-center gap-1 text-[var(--color-warning)]">
            <Zap size={10} />
            YOLO
          </span>
        )}
      </div>

      {/* Current Feature */}
      {agent.current_feature_id && (
        <div className="text-xs text-[var(--color-text-secondary)] mb-3">
          Feature #{agent.current_feature_id}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--color-border)]">
        {agent.status === 'paused' ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onResume()
            }}
            className="btn btn-ghost btn-sm flex-1"
            title="Resume"
          >
            <Play size={14} />
          </button>
        ) : isActive ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPause()
            }}
            className="btn btn-ghost btn-sm flex-1"
            title="Pause"
          >
            <Pause size={14} />
          </button>
        ) : null}

        {isActive || agent.status === 'paused' ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onStop()
            }}
            className="btn btn-ghost btn-sm flex-1 text-[var(--color-danger)]"
            title="Stop"
          >
            <Square size={14} />
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function AgentPoolDashboard({
  projectName,
  onAgentSelect,
  selectedAgentId,
}: AgentPoolDashboardProps) {
  const [poolStatus, setPoolStatus] = useState<AgentPoolStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSpawning, setIsSpawning] = useState(false)
  const [spawnCount, setSpawnCount] = useState(1)

  const fetchStatus = useCallback(async () => {
    try {
      const status = await getAgentPoolStatus(projectName)
      setPoolStatus(status)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pool status')
    } finally {
      setIsLoading(false)
    }
  }, [projectName])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 3000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  const handleSpawnAgents = async () => {
    setIsSpawning(true)
    try {
      await spawnAgents(projectName, {
        count: spawnCount,
        model: 'claude-opus-4-6',
        yolo_mode: false,
      })
      await fetchStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to spawn agents')
    } finally {
      setIsSpawning(false)
    }
  }

  const handleStopAgent = async (agentId: string) => {
    try {
      await stopPoolAgent(projectName, agentId)
      await fetchStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop agent')
    }
  }

  const handlePauseAgent = async (agentId: string) => {
    try {
      await pausePoolAgent(projectName, agentId)
      await fetchStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause agent')
    }
  }

  const handleResumeAgent = async (agentId: string) => {
    try {
      await resumePoolAgent(projectName, agentId)
      await fetchStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume agent')
    }
  }

  const handleStopAll = async () => {
    try {
      await stopAllAgents(projectName)
      await fetchStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop all agents')
    }
  }

  if (isLoading) {
    return (
      <div className="card p-6 flex items-center justify-center">
        <RefreshCw className="animate-spin" size={24} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-[var(--color-accent)]" />
            <h3 className="font-display font-bold text-lg">Agent Pool</h3>
          </div>
          <button
            onClick={fetchStatus}
            className="btn btn-ghost btn-icon p-2"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-[var(--color-bg-tertiary)] rounded-lg border-2 border-[var(--color-border)]">
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">
              {poolStatus?.total_count ?? 0}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">Total</div>
          </div>
          <div className="text-center p-3 bg-[var(--color-bg-tertiary)] rounded-lg border-2 border-[var(--color-border)]">
            <div className="text-2xl font-bold text-[var(--color-success)]">
              {poolStatus?.working_count ?? 0}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">Working</div>
          </div>
          <div className="text-center p-3 bg-[var(--color-bg-tertiary)] rounded-lg border-2 border-[var(--color-border)]">
            <div className="text-2xl font-bold text-[var(--color-warning)]">
              {poolStatus?.idle_count ?? 0}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">Idle</div>
          </div>
          <div className="text-center p-3 bg-[var(--color-bg-tertiary)] rounded-lg border-2 border-[var(--color-border)]">
            <div className="text-2xl font-bold text-[var(--color-text-tertiary)]">
              {poolStatus?.paused_count ?? 0}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">Paused</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={10}
              value={spawnCount}
              onChange={(e) => setSpawnCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
              className="input w-16 text-center"
            />
            <button
              onClick={handleSpawnAgents}
              disabled={isSpawning || (poolStatus?.total_count ?? 0) >= (poolStatus?.max_agents ?? 10)}
              className="btn btn-primary"
            >
              <Plus size={16} />
              {isSpawning ? 'Spawning...' : 'Spawn Agents'}
            </button>
          </div>

          {(poolStatus?.active_count ?? 0) > 0 && (
            <button
              onClick={handleStopAll}
              className="btn btn-ghost text-[var(--color-danger)]"
            >
              <Square size={16} />
              Stop All
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="card p-3 bg-[var(--color-danger)] text-white flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Agent Grid */}
      {poolStatus && poolStatus.agents.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {poolStatus.agents.map((agent) => (
            <AgentCard
              key={agent.agent_id}
              agent={agent}
              isSelected={selectedAgentId === agent.agent_id}
              onSelect={() => onAgentSelect?.(agent.agent_id)}
              onStop={() => handleStopAgent(agent.agent_id)}
              onPause={() => handlePauseAgent(agent.agent_id)}
              onResume={() => handleResumeAgent(agent.agent_id)}
            />
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center">
          <Cpu size={48} className="mx-auto mb-4 text-[var(--color-text-tertiary)]" />
          <h4 className="font-display font-bold mb-2">No Agents Running</h4>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            Spawn agents to start working on features in parallel.
          </p>
        </div>
      )}
    </div>
  )
}
