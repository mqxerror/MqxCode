/**
 * Log Parser Utility
 *
 * Parses agent output for semantic meaning, extracting structured information
 * from log lines to enable enhanced display with icons, colors, and metadata.
 */

/**
 * Types of log entries the agent produces
 */
export type LogEntryType =
  | 'tool_call'
  | 'tool_result'
  | 'success'
  | 'error'
  | 'warning'
  | 'status'
  | 'feature_start'
  | 'feature_complete'
  | 'file_operation'
  | 'thinking'
  | 'info'

/**
 * Structured representation of a parsed log entry
 */
export interface ParsedLogEntry {
  /** Type of log entry for styling and icon selection */
  type: LogEntryType
  /** The display text for the log entry */
  text: string
  /** Original raw log line */
  rawText: string
  /** Timestamp of the log entry */
  timestamp: string
  /** Additional metadata extracted from the log */
  metadata: LogEntryMetadata
}

/**
 * Metadata extracted from log entries
 */
export interface LogEntryMetadata {
  /** Tool name if this is a tool call/result */
  toolName?: string
  /** File path if this involves a file operation */
  filePath?: string
  /** Feature ID if this is feature-related */
  featureId?: number
  /** Feature name if this is feature-related */
  featureName?: string
  /** Step number if part of a multi-step process */
  stepNumber?: number
  /** Total steps if part of a multi-step process */
  totalSteps?: number
  /** Error message if this is an error */
  errorMessage?: string
  /** Duration in milliseconds if available */
  durationMs?: number
}

/**
 * Pattern definition for log parsing
 */
interface LogPattern {
  pattern: RegExp
  type: LogEntryType
  extract?: (match: RegExpMatchArray, line: string) => Partial<LogEntryMetadata>
  format?: (match: RegExpMatchArray, line: string) => string
}

/**
 * Patterns to detect and parse specific log entry types
 */
const LOG_PATTERNS: LogPattern[] = [
  // Tool calls
  {
    pattern: /^\[Tool:\s*(\w+)\]/i,
    type: 'tool_call',
    extract: (match) => ({ toolName: match[1] }),
    format: (match) => `Tool: ${match[1]}`,
  },
  {
    pattern: /^Tool Call:\s*(\w+)/i,
    type: 'tool_call',
    extract: (match) => ({ toolName: match[1] }),
    format: (match) => `Tool: ${match[1]}`,
  },
  {
    pattern: /^Using tool:\s*(\w+)/i,
    type: 'tool_call',
    extract: (match) => ({ toolName: match[1] }),
    format: (match) => `Using: ${match[1]}`,
  },

  // Tool results
  {
    pattern: /^\[Done\]/i,
    type: 'tool_result',
    format: () => 'Tool completed successfully',
  },
  {
    pattern: /^Output:/i,
    type: 'tool_result',
    format: (_, line) => line,
  },

  // Feature markers
  {
    pattern: /^Starting feature #(\d+)(?::\s*(.+))?/i,
    type: 'feature_start',
    extract: (match) => ({
      featureId: parseInt(match[1], 10),
      featureName: match[2] || undefined,
    }),
    format: (match) => `Starting Feature #${match[1]}${match[2] ? `: ${match[2]}` : ''}`,
  },
  {
    pattern: /^Feature #(\d+)\s*(?:complete|passing|done)/i,
    type: 'feature_complete',
    extract: (match) => ({ featureId: parseInt(match[1], 10) }),
    format: (match) => `Feature #${match[1]} completed`,
  },
  {
    pattern: /^Working on feature:?\s*#?(\d+)?:?\s*(.+)?/i,
    type: 'feature_start',
    extract: (match) => ({
      featureId: match[1] ? parseInt(match[1], 10) : undefined,
      featureName: match[2] || undefined,
    }),
    format: (_, line) => line,
  },

  // File operations
  {
    pattern: /^Writing to:\s*(.+)/i,
    type: 'file_operation',
    extract: (match) => ({ filePath: match[1].trim() }),
    format: (match) => `Writing: ${extractFileName(match[1].trim())}`,
  },
  {
    pattern: /^Reading:?\s*(.+)/i,
    type: 'file_operation',
    extract: (match) => ({ filePath: match[1].trim() }),
    format: (match) => `Reading: ${extractFileName(match[1].trim())}`,
  },
  {
    pattern: /^Creating:?\s*(.+)/i,
    type: 'file_operation',
    extract: (match) => ({ filePath: match[1].trim() }),
    format: (match) => `Creating: ${extractFileName(match[1].trim())}`,
  },
  {
    pattern: /^Editing:?\s*(.+)/i,
    type: 'file_operation',
    extract: (match) => ({ filePath: match[1].trim() }),
    format: (match) => `Editing: ${extractFileName(match[1].trim())}`,
  },

  // Errors
  {
    pattern: /^\[Error\]:?\s*(.+)?/i,
    type: 'error',
    extract: (match) => ({ errorMessage: match[1] }),
    format: (match) => match[1] ? `Error: ${match[1]}` : 'Error occurred',
  },
  {
    pattern: /^Error:\s*(.+)/i,
    type: 'error',
    extract: (match) => ({ errorMessage: match[1] }),
    format: (match) => `Error: ${match[1]}`,
  },
  {
    pattern: /^Exception:\s*(.+)/i,
    type: 'error',
    extract: (match) => ({ errorMessage: match[1] }),
    format: (match) => `Exception: ${match[1]}`,
  },
  {
    pattern: /^Traceback/i,
    type: 'error',
    format: () => 'Traceback (see details)',
  },

  // Warnings
  {
    pattern: /^Warning:\s*(.+)/i,
    type: 'warning',
    format: (match) => `Warning: ${match[1]}`,
  },
  {
    pattern: /^WARN:\s*(.+)/i,
    type: 'warning',
    format: (match) => `Warning: ${match[1]}`,
  },

  // Success messages
  {
    pattern: /^Success:\s*(.+)/i,
    type: 'success',
    format: (match) => `Success: ${match[1]}`,
  },
  {
    pattern: /^SESSION COMPLETE/i,
    type: 'success',
    format: () => 'Session complete',
  },
  {
    pattern: /^Tests? pass(?:ed|ing)?/i,
    type: 'success',
    format: (_, line) => line,
  },
  {
    pattern: /^Build successful/i,
    type: 'success',
    format: () => 'Build successful',
  },

  // Status updates
  {
    pattern: /^Sending prompt to Claude/i,
    type: 'status',
    format: () => 'Sending prompt to Claude...',
  },
  {
    pattern: /^Agent will auto-continue/i,
    type: 'status',
    format: (_, line) => line,
  },
  {
    pattern: /^Processing|^Analyzing|^Checking/i,
    type: 'status',
    format: (_, line) => line,
  },

  // Thinking/narrative
  {
    pattern: /^I'll |^I will |^Let me |^Now I|^First,|^Next,|^Then,|^Finally,/i,
    type: 'thinking',
    format: (_, line) => line,
  },
]

/**
 * Extract just the filename from a full path
 */
function extractFileName(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || filePath
}

/**
 * Parse a single log line into a structured entry
 */
export function parseLogLine(line: string, timestamp: string): ParsedLogEntry {
  const trimmedLine = line.trim()

  // Try to match against known patterns
  for (const { pattern, type, extract, format } of LOG_PATTERNS) {
    const match = trimmedLine.match(pattern)
    if (match) {
      return {
        type,
        text: format ? format(match, trimmedLine) : trimmedLine,
        rawText: line,
        timestamp,
        metadata: extract ? extract(match, trimmedLine) : {},
      }
    }
  }

  // Determine fallback type based on content
  const lowerLine = trimmedLine.toLowerCase()
  let type: LogEntryType = 'info'

  if (lowerLine.includes('error') || lowerLine.includes('exception') || lowerLine.includes('failed')) {
    type = 'error'
  } else if (lowerLine.includes('warn')) {
    type = 'warning'
  } else if (lowerLine.includes('success') || lowerLine.includes('complete') || lowerLine.includes('passed')) {
    type = 'success'
  }

  return {
    type,
    text: trimmedLine,
    rawText: line,
    timestamp,
    metadata: {},
  }
}

/**
 * Parse multiple log lines into structured entries
 */
export function parseLogs(logs: Array<{ line: string; timestamp: string }>): ParsedLogEntry[] {
  return logs.map((log) => parseLogLine(log.line, log.timestamp))
}

/**
 * Agent context extracted from recent logs
 * Represents the current state of what the agent is working on
 */
export interface AgentContext {
  /** Current feature being worked on */
  currentFeature: {
    id: number | null
    name: string | null
  }
  /** Current task/step description */
  currentTask: string | null
  /** Step progress within current task */
  stepProgress: {
    current: number
    total: number
  } | null
  /** Current file being worked on */
  workingFile: string | null
  /** Last tool that was called */
  lastToolCall: string | null
  /** Timestamp of last activity */
  lastActivityTime: string | null
}

/**
 * Patterns to extract context information from logs
 */
const CONTEXT_PATTERNS = {
  feature: [
    /Starting feature #(\d+)(?::\s*(.+))?/i,
    /Working on feature:?\s*#?(\d+)?:?\s*(.+)?/i,
    /Feature #(\d+)(?::\s*(.+))?/i,
    /Implementing:?\s*(.+)/i,
  ],
  task: [
    /Task:\s*(.+)/i,
    /Step:\s*(.+)/i,
    /Currently:\s*(.+)/i,
    /^I'll\s+(.+?)(?:\.|$)/i,
    /^Let me\s+(.+?)(?:\.|$)/i,
    /^Now I(?:'m| will)\s+(.+?)(?:\.|$)/i,
  ],
  stepProgress: [
    /Step\s+(\d+)\s*(?:of|\/)\s*(\d+)/i,
    /\((\d+)\/(\d+)\)/,
    /Progress:\s*(\d+)\s*(?:of|\/)\s*(\d+)/i,
  ],
  file: [
    /Writing to:\s*(.+)/i,
    /Reading:?\s*(.+)/i,
    /Creating:?\s*(.+)/i,
    /Editing:?\s*(.+)/i,
    /File:\s*(.+)/i,
    /Working on:?\s*(.+\.\w+)/i,
  ],
  tool: [
    /^\[Tool:\s*(\w+)\]/i,
    /^Tool Call:\s*(\w+)/i,
    /^Using tool:\s*(\w+)/i,
  ],
}

/**
 * Extract agent context from recent logs
 * Searches through logs to build a picture of what the agent is currently working on
 */
export function extractAgentContext(logs: Array<{ line: string; timestamp: string }>): AgentContext {
  const context: AgentContext = {
    currentFeature: { id: null, name: null },
    currentTask: null,
    stepProgress: null,
    workingFile: null,
    lastToolCall: null,
    lastActivityTime: logs.length > 0 ? logs[logs.length - 1].timestamp : null,
  }

  // Search through logs from most recent to oldest (limit search to recent logs)
  const recentLogs = logs.slice(-50)

  for (let i = recentLogs.length - 1; i >= 0; i--) {
    const line = recentLogs[i].line.trim()

    // Extract feature info (only if not already found)
    if (context.currentFeature.id === null) {
      for (const pattern of CONTEXT_PATTERNS.feature) {
        const match = line.match(pattern)
        if (match) {
          if (match[1] && /^\d+$/.test(match[1])) {
            context.currentFeature.id = parseInt(match[1], 10)
            context.currentFeature.name = match[2] || null
          } else if (match[1]) {
            context.currentFeature.name = match[1]
          }
          break
        }
      }
    }

    // Extract current task (only if not already found)
    if (context.currentTask === null) {
      for (const pattern of CONTEXT_PATTERNS.task) {
        const match = line.match(pattern)
        if (match && match[1]) {
          // Clean up the task description
          let task = match[1].trim()
          // Truncate if too long
          if (task.length > 80) {
            task = task.substring(0, 77) + '...'
          }
          context.currentTask = task
          break
        }
      }
    }

    // Extract step progress (only if not already found)
    if (context.stepProgress === null) {
      for (const pattern of CONTEXT_PATTERNS.stepProgress) {
        const match = line.match(pattern)
        if (match) {
          context.stepProgress = {
            current: parseInt(match[1], 10),
            total: parseInt(match[2], 10),
          }
          break
        }
      }
    }

    // Extract working file (only if not already found, and prefer recent)
    if (context.workingFile === null) {
      for (const pattern of CONTEXT_PATTERNS.file) {
        const match = line.match(pattern)
        if (match && match[1]) {
          context.workingFile = match[1].trim()
          break
        }
      }
    }

    // Extract last tool call (only if not already found)
    if (context.lastToolCall === null) {
      for (const pattern of CONTEXT_PATTERNS.tool) {
        const match = line.match(pattern)
        if (match && match[1]) {
          context.lastToolCall = match[1]
          break
        }
      }
    }

    // Stop early if we have all context
    if (
      context.currentFeature.id !== null &&
      context.currentTask !== null &&
      context.stepProgress !== null &&
      context.workingFile !== null &&
      context.lastToolCall !== null
    ) {
      break
    }
  }

  return context
}

/**
 * Get a display-friendly file name from a full path
 * Shows just the filename with optional directory context
 */
export function formatFilePath(filePath: string, showDir = true): string {
  const normalized = filePath.replace(/\\/g, '/')
  const parts = normalized.split('/')
  const fileName = parts[parts.length - 1] || filePath

  if (!showDir || parts.length <= 2) {
    return fileName
  }

  // Show parent directory + filename
  const parent = parts[parts.length - 2]
  return `${parent}/${fileName}`
}

/**
 * Check if a log line represents significant activity
 * Used to determine if the agent is actively working
 */
export function isSignificantActivity(line: string): boolean {
  const trimmed = line.trim()

  // Skip empty or very short lines
  if (trimmed.length < 5) return false

  // Skip technical/internal lines
  if (/^\s*Input:\s*\{/.test(trimmed)) return false
  if (/^-{10,}/.test(trimmed)) return false
  if (/^[[{]/.test(trimmed)) return false

  // Check for known activity patterns
  for (const { pattern } of LOG_PATTERNS) {
    if (pattern.test(trimmed)) return true
  }

  // Consider narrative text as activity
  if (/^[A-Z]/.test(trimmed) && trimmed.length > 20) return true

  return false
}

/**
 * Filter logs to only significant entries
 */
export function filterSignificantLogs(logs: Array<{ line: string; timestamp: string }>): Array<{ line: string; timestamp: string }> {
  return logs.filter((log) => isSignificantActivity(log.line))
}
