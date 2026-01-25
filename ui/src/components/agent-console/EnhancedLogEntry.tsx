/**
 * Enhanced Log Entry Component
 *
 * Displays individual log entries with semantic parsing, icons, and color-coding.
 * Supports showing metadata on hover and provides visual differentiation
 * between different types of log entries (tool calls, errors, status updates, etc.).
 */

import { useState, useMemo, memo, useRef, useEffect } from 'react'
import { motion } from 'framer-motion' // Keep for MetadataTooltip animation
import {
  Wrench,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  FileCode,
  Play,
  Square,
  Brain,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import { cn } from '../aceternity/cn'
import type { ParsedLogEntry, LogEntryType } from '../../lib/logParser'
import { formatFilePath } from '../../lib/logParser'

interface EnhancedLogEntryProps {
  /** Parsed log entry data */
  entry: ParsedLogEntry
  /** Whether to show expanded metadata */
  showMetadata?: boolean
  /** Whether the entry is part of an active (running) agent */
  isActive?: boolean
  /** Index for animation staggering */
  index?: number
}

/**
 * Icon configuration for each log entry type
 */
const LOG_TYPE_CONFIG: Record<
  LogEntryType,
  {
    icon: typeof Wrench
    color: string
    bgColor: string
    label: string
  }
> = {
  tool_call: {
    icon: Wrench,
    color: 'text-[var(--color-accent-secondary)]',
    bgColor: 'bg-[var(--color-accent-secondary)]/10',
    label: 'Tool',
  },
  tool_result: {
    icon: CheckCircle2,
    color: 'text-[var(--color-success)]',
    bgColor: 'bg-[var(--color-success)]/10',
    label: 'Result',
  },
  success: {
    icon: CheckCircle2,
    color: 'text-[var(--color-success)]',
    bgColor: 'bg-[var(--color-success)]/10',
    label: 'Success',
  },
  error: {
    icon: XCircle,
    color: 'text-[var(--color-danger)]',
    bgColor: 'bg-[var(--color-danger)]/10',
    label: 'Error',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-[var(--color-warning)]',
    bgColor: 'bg-[var(--color-warning)]/10',
    label: 'Warning',
  },
  status: {
    icon: Info,
    color: 'text-[var(--color-info)]',
    bgColor: 'bg-[var(--color-info)]/10',
    label: 'Status',
  },
  feature_start: {
    icon: Play,
    color: 'text-[var(--color-accent-primary)]',
    bgColor: 'bg-[var(--color-accent-primary)]/10',
    label: 'Feature',
  },
  feature_complete: {
    icon: Square,
    color: 'text-[var(--color-success)]',
    bgColor: 'bg-[var(--color-success)]/10',
    label: 'Complete',
  },
  file_operation: {
    icon: FileCode,
    color: 'text-[var(--color-info)]',
    bgColor: 'bg-[var(--color-info)]/10',
    label: 'File',
  },
  thinking: {
    icon: Brain,
    color: 'text-[var(--color-accent-primary)]',
    bgColor: 'bg-[var(--color-accent-primary)]/10',
    label: 'Thinking',
  },
  info: {
    icon: Info,
    color: 'text-[var(--color-text-secondary)]',
    bgColor: 'bg-[var(--color-bg-tertiary)]',
    label: 'Info',
  },
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return ''
  }
}

/**
 * Metadata tooltip content
 */
function MetadataTooltip({ entry }: { entry: ParsedLogEntry }) {
  const { metadata } = entry
  const hasMetadata =
    metadata.toolName ||
    metadata.filePath ||
    metadata.featureId ||
    metadata.featureName ||
    metadata.errorMessage

  if (!hasMetadata) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className={cn(
        'absolute left-0 right-0 top-full mt-1 z-50',
        'bg-[var(--color-bg-elevated)] border border-[var(--color-border)]',
        'rounded-lg p-3 shadow-lg'
      )}
    >
      <div className="space-y-1.5 text-xs">
        {metadata.toolName && (
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-text-tertiary)]">Tool:</span>
            <span className="text-[var(--color-accent-secondary)] font-mono">{metadata.toolName}</span>
          </div>
        )}
        {metadata.filePath && (
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-text-tertiary)]">File:</span>
            <span className="text-[var(--color-info)] font-mono truncate">
              {formatFilePath(metadata.filePath, true)}
            </span>
          </div>
        )}
        {metadata.featureId && (
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-text-tertiary)]">Feature:</span>
            <span className="text-[var(--color-accent-primary)] font-mono">
              #{metadata.featureId}
              {metadata.featureName && `: ${metadata.featureName}`}
            </span>
          </div>
        )}
        {metadata.errorMessage && (
          <div className="flex items-start gap-2">
            <span className="text-[var(--color-text-tertiary)] shrink-0">Error:</span>
            <span className="text-[var(--color-danger)] font-mono break-all">{metadata.errorMessage}</span>
          </div>
        )}
        <div className="flex items-center gap-2 pt-1 border-t border-[var(--color-border)]">
          <span className="text-[var(--color-text-tertiary)]">Raw:</span>
          <span className="text-[var(--color-text-secondary)] font-mono truncate">{entry.rawText}</span>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Enhanced log entry component with semantic parsing and visual indicators
 */
export const EnhancedLogEntry = memo(function EnhancedLogEntry({
  entry,
  showMetadata = true,
  isActive = false,
}: EnhancedLogEntryProps) {
  const [isHovered, setIsHovered] = useState(false)

  const config = useMemo(() => LOG_TYPE_CONFIG[entry.type], [entry.type])
  const Icon = config.icon

  // Determine if this entry has expandable metadata
  const hasExpandableMetadata = useMemo(() => {
    const { metadata } = entry
    return (
      metadata.toolName ||
      metadata.filePath ||
      metadata.featureId ||
      metadata.errorMessage
    )
  }, [entry])

  // Determine text color based on type
  const textColor = useMemo(() => {
    switch (entry.type) {
      case 'error':
        return 'text-[var(--color-danger)]'
      case 'warning':
        return 'text-[var(--color-warning)]'
      case 'success':
      case 'tool_result':
      case 'feature_complete':
        return 'text-[var(--color-success)]'
      case 'tool_call':
      case 'file_operation':
        return 'text-[var(--color-info)]'
      case 'thinking':
      case 'feature_start':
        return 'text-[var(--color-accent-primary)]'
      default:
        return 'text-[var(--color-text-secondary)]'
    }
  }, [entry.type])

  return (
    <div
      className={cn(
        'relative group',
        'flex items-start gap-2 px-2 py-1.5 rounded-lg',
        'hover:bg-[var(--color-bg-secondary)] transition-colors duration-150',
        'contain-content', // Prevent layout recalculation
        entry.type === 'error' && 'bg-[var(--color-danger)]/5',
        entry.type === 'warning' && 'bg-[var(--color-warning)]/5'
      )}
      style={{ contain: 'content' }} // CSS containment for performance
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Timestamp */}
      <span className="text-[10px] text-[var(--color-text-tertiary)] font-mono shrink-0 pt-0.5">
        {formatTimestamp(entry.timestamp)}
      </span>

      {/* Icon */}
      <span
        className={cn(
          'shrink-0 w-5 h-5 flex items-center justify-center rounded',
          config.bgColor
        )}
      >
        {isActive && (entry.type === 'tool_call' || entry.type === 'status') ? (
          <Loader2 size={12} className={cn(config.color, 'animate-spin')} />
        ) : (
          <Icon size={12} className={config.color} />
        )}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0 flex items-start gap-2">
        <span
          className={cn(
            'text-xs font-mono whitespace-pre-wrap break-all',
            textColor
          )}
        >
          {entry.text}
        </span>

        {/* Expand indicator for entries with metadata */}
        {showMetadata && hasExpandableMetadata && (
          <ChevronRight
            size={12}
            className={cn(
              'shrink-0 mt-0.5 text-[var(--color-text-tertiary)] transition-transform',
              isHovered && 'rotate-90'
            )}
          />
        )}
      </div>

      {/* Type badge (shown on hover) */}
      <span
        className={cn(
          'shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          config.bgColor,
          config.color
        )}
      >
        {config.label}
      </span>

      {/* Metadata tooltip */}
      {showMetadata && isHovered && hasExpandableMetadata && (
        <MetadataTooltip entry={entry} />
      )}
    </div>
  )
})

/**
 * Props for the enhanced log list component
 */
interface EnhancedLogListProps {
  /** Parsed log entries to display */
  entries: ParsedLogEntry[]
  /** Whether to show metadata on hover */
  showMetadata?: boolean
  /** Whether the agent is currently active */
  isActive?: boolean
  /** Optional filter by log type */
  filterTypes?: LogEntryType[]
  /** Optional search term for filtering */
  searchTerm?: string
}

/**
 * List component that renders multiple enhanced log entries
 * with optional filtering capabilities and windowed rendering for performance
 */
export function EnhancedLogList({
  entries,
  showMetadata = true,
  isActive = false,
  filterTypes,
  searchTerm,
}: EnhancedLogListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 100 })
  const ITEM_HEIGHT = 32 // Approximate height of each log entry
  const BUFFER = 20 // Extra items to render above/below viewport

  // Filter entries based on type and search term
  const filteredEntries = useMemo(() => {
    let result = entries

    // Filter by type if specified
    if (filterTypes && filterTypes.length > 0) {
      result = result.filter((entry) => filterTypes.includes(entry.type))
    }

    // Filter by search term if specified
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (entry) =>
          entry.text.toLowerCase().includes(term) ||
          entry.rawText.toLowerCase().includes(term) ||
          entry.metadata.toolName?.toLowerCase().includes(term) ||
          entry.metadata.filePath?.toLowerCase().includes(term) ||
          entry.metadata.featureName?.toLowerCase().includes(term)
      )
    }

    return result
  }, [entries, filterTypes, searchTerm])

  // Update visible range on scroll - only for large lists
  useEffect(() => {
    const container = containerRef.current?.parentElement
    if (!container || filteredEntries.length < 100) {
      // For small lists, render all
      setVisibleRange({ start: 0, end: filteredEntries.length })
      return
    }

    const handleScroll = () => {
      const scrollTop = container.scrollTop
      const viewportHeight = container.clientHeight

      const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER)
      const endIndex = Math.min(
        filteredEntries.length,
        Math.ceil((scrollTop + viewportHeight) / ITEM_HEIGHT) + BUFFER
      )

      setVisibleRange({ start: startIndex, end: endIndex })
    }

    handleScroll() // Initial calculation
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [filteredEntries.length, ITEM_HEIGHT])

  if (filteredEntries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full py-8 text-[var(--color-text-tertiary)] text-sm">
        {entries.length === 0 ? 'No logs yet. Start the agent to see output.' : 'No matching logs found.'}
      </div>
    )
  }

  // For small lists, render all entries
  if (filteredEntries.length < 100) {
    return (
      <div ref={containerRef} className="space-y-0.5">
        {filteredEntries.map((entry, index) => (
          <EnhancedLogEntry
            key={`${entry.timestamp}-${index}`}
            entry={entry}
            showMetadata={showMetadata}
            isActive={isActive && index === filteredEntries.length - 1}
            index={index}
          />
        ))}
      </div>
    )
  }

  // For large lists, use windowed rendering
  const visibleEntries = filteredEntries.slice(visibleRange.start, visibleRange.end)
  const topPadding = visibleRange.start * ITEM_HEIGHT
  const bottomPadding = (filteredEntries.length - visibleRange.end) * ITEM_HEIGHT

  return (
    <div ref={containerRef}>
      {/* Top spacer */}
      {topPadding > 0 && <div style={{ height: topPadding }} />}

      {/* Visible entries */}
      <div className="space-y-0.5">
        {visibleEntries.map((entry, index) => (
          <EnhancedLogEntry
            key={`${entry.timestamp}-${visibleRange.start + index}`}
            entry={entry}
            showMetadata={showMetadata}
            isActive={isActive && visibleRange.start + index === filteredEntries.length - 1}
            index={visibleRange.start + index}
          />
        ))}
      </div>

      {/* Bottom spacer */}
      {bottomPadding > 0 && <div style={{ height: bottomPadding }} />}
    </div>
  )
}

/**
 * Log type filter chip component
 */
interface LogTypeFilterProps {
  type: LogEntryType
  isSelected: boolean
  onToggle: () => void
}

export function LogTypeFilter({ type, isSelected, onToggle }: LogTypeFilterProps) {
  const config = LOG_TYPE_CONFIG[type]
  const Icon = config.icon

  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all',
        isSelected
          ? cn(config.bgColor, config.color)
          : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
      )}
    >
      <Icon size={12} />
      <span>{config.label}</span>
    </button>
  )
}

/**
 * Component showing available log type filters
 */
export function LogTypeFilters({
  selectedTypes,
  onTypeToggle,
  onClearFilters,
}: {
  selectedTypes: LogEntryType[]
  onTypeToggle: (type: LogEntryType) => void
  onClearFilters: () => void
}) {
  const filterableTypes: LogEntryType[] = [
    'tool_call',
    'error',
    'warning',
    'success',
    'file_operation',
    'thinking',
  ]

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {filterableTypes.map((type) => (
        <LogTypeFilter
          key={type}
          type={type}
          isSelected={selectedTypes.includes(type)}
          onToggle={() => onTypeToggle(type)}
        />
      ))}
      {selectedTypes.length > 0 && (
        <button
          onClick={onClearFilters}
          className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] underline"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
