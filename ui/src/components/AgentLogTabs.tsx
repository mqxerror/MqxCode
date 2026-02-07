/**
 * Agent Log Tabs
 *
 * Tabbed interface for viewing logs from multiple agents.
 * Supports real-time log streaming via WebSocket.
 */

import { useState, useRef, useEffect } from 'react'
import {
  Terminal,
  Cpu,
  Trash2,
  Download,
  Search,
  X,
  ChevronDown,
} from 'lucide-react'
import type { AgentInfo, AgentInstanceStatus } from '../lib/types'

interface LogEntry {
  timestamp: Date
  line: string
  agentId: string
}

interface AgentLogTabsProps {
  agents: AgentInfo[]
  logs: Map<string, LogEntry[]>
  selectedAgentId: string | null
  onSelectAgent: (agentId: string | null) => void
  onClearLogs: (agentId: string | null) => void
}

const STATUS_COLORS: Record<AgentInstanceStatus, string> = {
  idle: 'var(--color-warning)',
  working: 'var(--color-success)',
  paused: 'var(--color-text-secondary)',
  stopped: 'var(--color-text-tertiary)',
  crashed: 'var(--color-danger)',
}

function LogLine({ entry }: { entry: LogEntry }) {
  const time = entry.timestamp.toLocaleTimeString()

  // Basic syntax highlighting for common patterns
  const highlightLine = (line: string) => {
    // Error patterns
    if (/error|Error|ERROR|failed|Failed|FAILED/i.test(line)) {
      return <span className="text-[var(--color-danger)]">{line}</span>
    }
    // Success patterns
    if (/success|Success|SUCCESS|passed|Passed|PASSED|complete/i.test(line)) {
      return <span className="text-[var(--color-success)]">{line}</span>
    }
    // Warning patterns
    if (/warning|Warning|WARNING|skip|Skip|SKIP/i.test(line)) {
      return <span className="text-[var(--color-warning)]">{line}</span>
    }
    // Tool calls
    if (/tool_call|ToolCall|mcp_tool/i.test(line)) {
      return <span className="text-[var(--color-accent)]">{line}</span>
    }
    return line
  }

  return (
    <div className="flex gap-2 py-0.5 font-mono text-xs hover:bg-[var(--color-bg-tertiary)]">
      <span className="text-[var(--color-text-tertiary)] shrink-0">{time}</span>
      <span className="text-[var(--color-text-primary)] break-all">
        {highlightLine(entry.line)}
      </span>
    </div>
  )
}

export function AgentLogTabs({
  agents,
  logs,
  selectedAgentId,
  onSelectAgent,
  onClearLogs,
}: AgentLogTabsProps) {
  const logsEndRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  // Get logs for selected agent (or all if null)
  const displayedLogs = selectedAgentId
    ? logs.get(selectedAgentId) || []
    : Array.from(logs.values())
        .flat()
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  // Filter logs by search term
  const filteredLogs = searchTerm
    ? displayedLogs.filter((entry) =>
        entry.line.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : displayedLogs

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [filteredLogs, autoScroll])

  const handleDownload = () => {
    const content = filteredLogs
      .map((e) => `[${e.timestamp.toISOString()}] [${e.agentId}] ${e.line}`)
      .join('\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agent-logs-${selectedAgentId || 'all'}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex items-center gap-2 p-2 border-b-2 border-[var(--color-border)] bg-[var(--color-bg-secondary)] overflow-x-auto">
        <button
          onClick={() => onSelectAgent(null)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shrink-0 ${
            selectedAgentId === null
              ? 'bg-[var(--color-accent)] text-white'
              : 'hover:bg-[var(--color-bg-tertiary)]'
          }`}
        >
          <Terminal size={14} />
          All Agents
        </button>

        {agents.map((agent) => (
          <button
            key={agent.agent_id}
            onClick={() => onSelectAgent(agent.agent_id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shrink-0 ${
              selectedAgentId === agent.agent_id
                ? 'bg-[var(--color-accent)] text-white'
                : 'hover:bg-[var(--color-bg-tertiary)]'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: STATUS_COLORS[agent.status] }}
            />
            <Cpu size={14} />
            <span className="font-mono">{agent.agent_id.slice(0, 6)}</span>
          </button>
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`btn btn-ghost btn-icon p-1.5 ${showSearch ? 'bg-[var(--color-bg-tertiary)]' : ''}`}
            title="Search"
          >
            <Search size={14} />
          </button>
          <button
            onClick={handleDownload}
            className="btn btn-ghost btn-icon p-1.5"
            title="Download logs"
          >
            <Download size={14} />
          </button>
          <button
            onClick={() => onClearLogs(selectedAgentId)}
            className="btn btn-ghost btn-icon p-1.5 text-[var(--color-danger)]"
            title="Clear logs"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="flex items-center gap-2 p-2 border-b-2 border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
          <Search size={14} className="text-[var(--color-text-secondary)]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logs..."
            className="input flex-1 py-1 text-sm"
            autoFocus
          />
          {searchTerm && (
            <span className="text-xs text-[var(--color-text-secondary)]">
              {filteredLogs.length} matches
            </span>
          )}
          <button
            onClick={() => {
              setSearchTerm('')
              setShowSearch(false)
            }}
            className="btn btn-ghost btn-icon p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Log Content */}
      <div
        className="flex-1 overflow-y-auto p-3 bg-[var(--color-bg-primary)]"
        onScroll={(e) => {
          const target = e.target as HTMLDivElement
          const isAtBottom =
            target.scrollHeight - target.scrollTop <= target.clientHeight + 50
          setAutoScroll(isAtBottom)
        }}
      >
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Terminal size={48} className="text-[var(--color-text-tertiary)] mb-4" />
            <p className="text-sm text-[var(--color-text-secondary)]">
              {searchTerm ? 'No matching log entries' : 'No logs yet'}
            </p>
          </div>
        ) : (
          <>
            {filteredLogs.map((entry, i) => (
              <LogLine key={`${entry.agentId}-${i}`} entry={entry} />
            ))}
            <div ref={logsEndRef} />
          </>
        )}
      </div>

      {/* Auto-scroll indicator */}
      {!autoScroll && filteredLogs.length > 0 && (
        <button
          onClick={() => {
            setAutoScroll(true)
            logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
          }}
          className="absolute bottom-4 right-4 btn btn-primary btn-sm shadow-lg"
        >
          <ChevronDown size={14} />
          Jump to bottom
        </button>
      )}
    </div>
  )
}
