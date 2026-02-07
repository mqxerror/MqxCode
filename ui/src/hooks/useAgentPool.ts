/**
 * useAgentPool Hook
 *
 * Manages agent pool state with real-time WebSocket updates.
 * Provides methods for spawning, stopping, pausing, and resuming agents.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  AgentPoolStatus,
  AgentInfo,
  WSAgentPoolMessage,
  WSAgentLogMessage,
  WSAgentInstanceStatusMessage,
} from '../lib/types'
import {
  getAgentPoolStatus,
  spawnAgents,
  stopPoolAgent,
  pausePoolAgent,
  resumePoolAgent,
  stopAllAgents,
} from '../lib/api'

interface LogEntry {
  timestamp: Date
  line: string
  agentId: string
}

interface UseAgentPoolOptions {
  projectName: string
  enabled?: boolean
}

interface UseAgentPoolReturn {
  // State
  poolStatus: AgentPoolStatus | null
  agents: AgentInfo[]
  logs: Map<string, LogEntry[]>
  isLoading: boolean
  error: string | null

  // Actions
  spawn: (count: number, model?: string, yoloMode?: boolean) => Promise<void>
  stopAgent: (agentId: string) => Promise<void>
  pauseAgent: (agentId: string) => Promise<void>
  resumeAgent: (agentId: string) => Promise<void>
  stopAll: () => Promise<void>
  refresh: () => Promise<void>
  clearLogs: (agentId: string | null) => void

  // Connection
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
}

export function useAgentPool({
  projectName,
  enabled = true,
}: UseAgentPoolOptions): UseAgentPoolReturn {
  const [poolStatus, setPoolStatus] = useState<AgentPoolStatus | null>(null)
  const [logs, setLogs] = useState<Map<string, LogEntry[]>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected')

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch initial pool status
  const refresh = useCallback(async () => {
    if (!projectName) return

    try {
      setIsLoading(true)
      const status = await getAgentPoolStatus(projectName)
      setPoolStatus(status)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pool status')
    } finally {
      setIsLoading(false)
    }
  }, [projectName])

  // Connect to WebSocket for real-time updates
  const connect = useCallback(() => {
    if (!projectName || !enabled) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws/projects/${projectName}`

    setConnectionStatus('connecting')

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setConnectionStatus('connected')
      setError(null)
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)

        switch (message.type) {
          case 'agent_pool':
            const poolMsg = message as WSAgentPoolMessage
            setPoolStatus((prev) =>
              prev
                ? {
                    ...prev,
                    agents: poolMsg.agents,
                    active_count: poolMsg.active_count,
                    idle_count: poolMsg.idle_count,
                    working_count: poolMsg.working_count,
                    total_count: poolMsg.agents.length,
                  }
                : null
            )
            break

          case 'agent_log':
            const logMsg = message as WSAgentLogMessage
            setLogs((prev) => {
              const newLogs = new Map(prev)
              const agentLogs = newLogs.get(logMsg.agent_id) || []
              agentLogs.push({
                timestamp: new Date(logMsg.timestamp),
                line: logMsg.line,
                agentId: logMsg.agent_id,
              })
              // Keep only last 1000 lines per agent
              if (agentLogs.length > 1000) {
                agentLogs.splice(0, agentLogs.length - 1000)
              }
              newLogs.set(logMsg.agent_id, agentLogs)
              return newLogs
            })
            break

          case 'agent_instance_status':
            const statusMsg = message as WSAgentInstanceStatusMessage
            setPoolStatus((prev) => {
              if (!prev) return null
              return {
                ...prev,
                agents: prev.agents.map((a) =>
                  a.agent_id === statusMsg.agent_id
                    ? {
                        ...a,
                        status: statusMsg.status,
                        current_feature_id: statusMsg.feature_id,
                      }
                    : a
                ),
              }
            })
            break
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err)
      }
    }

    ws.onclose = () => {
      setConnectionStatus('disconnected')
      wsRef.current = null

      // Reconnect after 3 seconds
      if (enabled) {
        reconnectTimeoutRef.current = setTimeout(connect, 3000)
      }
    }

    ws.onerror = () => {
      setConnectionStatus('error')
    }
  }, [projectName, enabled])

  // Initialize connection
  useEffect(() => {
    if (enabled) {
      refresh()
      connect()
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [enabled, connect, refresh])

  // Actions
  const spawn = useCallback(
    async (count: number, model = 'claude-opus-4-6', yoloMode = false) => {
      try {
        await spawnAgents(projectName, { count, model, yolo_mode: yoloMode })
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to spawn agents')
        throw err
      }
    },
    [projectName, refresh]
  )

  const stopAgentAction = useCallback(
    async (agentId: string) => {
      try {
        await stopPoolAgent(projectName, agentId)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to stop agent')
        throw err
      }
    },
    [projectName, refresh]
  )

  const pauseAgentAction = useCallback(
    async (agentId: string) => {
      try {
        await pausePoolAgent(projectName, agentId)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to pause agent')
        throw err
      }
    },
    [projectName, refresh]
  )

  const resumeAgentAction = useCallback(
    async (agentId: string) => {
      try {
        await resumePoolAgent(projectName, agentId)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to resume agent')
        throw err
      }
    },
    [projectName, refresh]
  )

  const stopAllAction = useCallback(async () => {
    try {
      await stopAllAgents(projectName)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop all agents')
      throw err
    }
  }, [projectName, refresh])

  const clearLogs = useCallback((agentId: string | null) => {
    setLogs((prev) => {
      if (agentId === null) {
        return new Map()
      }
      const newLogs = new Map(prev)
      newLogs.delete(agentId)
      return newLogs
    })
  }, [])

  return {
    poolStatus,
    agents: poolStatus?.agents || [],
    logs,
    isLoading,
    error,
    spawn,
    stopAgent: stopAgentAction,
    pauseAgent: pauseAgentAction,
    resumeAgent: resumeAgentAction,
    stopAll: stopAllAction,
    refresh,
    clearLogs,
    connectionStatus,
  }
}
