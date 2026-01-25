import { useMemo, useState, useEffect } from 'react'
import { Brain, Send, Cpu, Wrench, Loader2, Sparkles, CheckCircle } from 'lucide-react'
import type { AgentStatus } from '../lib/types'

interface AgentThoughtProps {
  logs: Array<{ line: string; timestamp: string }>
  agentStatus: AgentStatus
}

const IDLE_TIMEOUT = 30000 // 30 seconds

// Agent activity types for different icons/styling
type ActivityType = 'thinking' | 'sending' | 'processing' | 'tool' | 'complete' | 'narrative'

interface ParsedActivity {
  type: ActivityType
  message: string
  toolName?: string
}

/**
 * Patterns to detect specific agent activities
 */
const ACTIVITY_PATTERNS: Array<{ pattern: RegExp; type: ActivityType; extract?: (match: RegExpMatchArray) => string }> = [
  { pattern: /^Sending prompt to Claude/i, type: 'sending', extract: () => 'Sending prompt to Claude Agent SDK...' },
  { pattern: /^Agent will auto-continue/i, type: 'processing', extract: (m) => m[0] },
  { pattern: /^Fresh start.*initializer/i, type: 'thinking', extract: () => 'Starting initializer agent...' },
  { pattern: /^Continuing existing project/i, type: 'thinking', extract: () => 'Continuing existing project...' },
  { pattern: /^SESSION COMPLETE/i, type: 'complete', extract: () => 'Session complete' },
  { pattern: /^Claude Agent SDK indicated limit/i, type: 'processing', extract: () => 'Reached turn limit, preparing to continue...' },
  { pattern: /^\[Tool:\s*(\w+)\]/, type: 'tool', extract: (m) => `Using tool: ${m[1]}` },
  { pattern: /^Processing|^Analyzing|^Reading|^Writing|^Creating|^Updating|^Checking/i, type: 'processing' },
  { pattern: /^I'll |^I will |^Let me |^Now I|^First,|^Next,/i, type: 'thinking' },
]

/**
 * Determines if a log line is an agent "thought" (narrative text)
 * vs. tool mechanics that should be hidden
 */
function isAgentThought(line: string): boolean {
  const trimmed = line.trim()

  // Skip tool input/output details
  if (/^\s*Input:\s*\{/.test(trimmed)) return false
  if (/^\[(Done|Error)\]/.test(trimmed)) return false
  if (/^Output:/.test(trimmed)) return false
  if (/^-{10,}/.test(trimmed)) return false

  // Skip JSON and very short lines
  if (/^[[{]/.test(trimmed)) return false
  if (trimmed.length < 10) return false

  // Skip lines that are just paths or technical output
  if (/^[A-Za-z]:\\/.test(trimmed)) return false
  if (/^\/[a-z]/.test(trimmed)) return false

  // Keep narrative text (starts with capital, looks like a sentence)
  return /^[A-Z]/.test(trimmed) && trimmed.length > 15
}

/**
 * Parse a log line to extract activity type and message
 */
function parseActivity(line: string): ParsedActivity | null {
  const trimmed = line.trim()

  // Check for specific patterns first
  for (const { pattern, type, extract } of ACTIVITY_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match) {
      return {
        type,
        message: extract ? extract(match) : trimmed,
        toolName: type === 'tool' ? match[1] : undefined,
      }
    }
  }

  // Fall back to narrative detection
  if (isAgentThought(trimmed)) {
    return {
      type: 'narrative',
      message: trimmed,
    }
  }

  return null
}

/**
 * Extracts the latest agent activity from logs
 */
function getLatestActivity(logs: Array<{ line: string; timestamp: string }>): ParsedActivity | null {
  // Search from most recent
  for (let i = logs.length - 1; i >= 0; i--) {
    const activity = parseActivity(logs[i].line)
    if (activity) {
      return activity
    }
  }
  return null
}

/**
 * Get icon component based on activity type
 */
function getActivityIcon(type: ActivityType, isAnimating: boolean) {
  const baseClass = isAnimating ? 'animate-pulse' : ''

  switch (type) {
    case 'sending':
      return <Send size={18} className={`text-[var(--color-info)] ${baseClass}`} />
    case 'processing':
      return <Cpu size={18} className={`text-[var(--color-warning)] ${isAnimating ? 'animate-spin' : ''}`} />
    case 'tool':
      return <Wrench size={18} className={`text-[var(--color-accent-secondary)] ${baseClass}`} />
    case 'complete':
      return <CheckCircle size={18} className="text-[var(--color-success)]" />
    case 'thinking':
      return <Sparkles size={18} className={`text-[var(--color-accent-primary)] ${baseClass}`} />
    case 'narrative':
    default:
      return <Brain size={18} className={`text-[var(--color-accent-primary)] ${baseClass}`} />
  }
}

/**
 * Get border color based on activity type
 */
function getActivityBorderColor(type: ActivityType): string {
  switch (type) {
    case 'sending':
      return 'border-[var(--color-info)]/50'
    case 'processing':
      return 'border-[var(--color-warning)]/50'
    case 'tool':
      return 'border-[var(--color-accent-secondary)]/50'
    case 'complete':
      return 'border-[var(--color-success)]/50'
    case 'thinking':
    case 'narrative':
    default:
      return 'border-[var(--color-accent-primary)]/50'
  }
}

export function AgentThought({ logs, agentStatus }: AgentThoughtProps) {
  const activity = useMemo(() => getLatestActivity(logs), [logs])
  const [displayedActivity, setDisplayedActivity] = useState<ParsedActivity | null>(null)

  // Get last log timestamp for idle detection
  const lastLogTimestamp = logs.length > 0
    ? new Date(logs[logs.length - 1].timestamp).getTime()
    : 0

  // Determine if component should be visible
  const shouldShow = useMemo(() => {
    if (!activity) return false
    if (agentStatus === 'running') return true
    if (agentStatus === 'paused') {
      return Date.now() - lastLogTimestamp < IDLE_TIMEOUT
    }
    return false
  }, [activity, agentStatus, lastLogTimestamp])

  // Update displayed activity
  useEffect(() => {
    if (activity) {
      setDisplayedActivity(activity)
    }
  }, [activity])

  const isRunning = agentStatus === 'running'

  if (!shouldShow || !displayedActivity) {
    return null
  }

  return (
    <div
      className={`
        relative overflow-hidden
        bg-[var(--color-bg-card)]
        border
        rounded-xl
        px-4 py-3
        flex items-center gap-3
        transition-colors duration-300
        ${isRunning ? getActivityBorderColor(displayedActivity.type) : 'border-[var(--color-border)]'}
      `}
    >
      {/* Activity Icon */}
      <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-bg-tertiary)]">
        {getActivityIcon(displayedActivity.type, isRunning)}
      </div>

      {/* Activity text */}
      <div className="flex-1 min-w-0">
        <p className="font-mono text-sm text-[var(--color-text-primary)] truncate">
          {displayedActivity.message.replace(/:$/, '')}
        </p>
        {isRunning && displayedActivity.type !== 'complete' && (
          <div className="flex items-center gap-2 mt-1">
            <Loader2 size={12} className="animate-spin text-[var(--color-text-tertiary)]" />
            <span className="text-xs text-[var(--color-text-tertiary)]">Agent is working...</span>
          </div>
        )}
      </div>
    </div>
  )
}
