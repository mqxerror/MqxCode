/**
 * Agent Context Bar Component
 *
 * Displays real-time information about what the agent is currently working on:
 * - Current feature being implemented
 * - Current task/step progress
 * - Working file
 * - Last tool call
 *
 * Provides an at-a-glance summary of agent activity without needing to read logs.
 */

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wrench,
  FileCode,
  ListChecks,
  Folder,
  Activity,
  Loader2,
  CheckCircle2,
  Hash,
} from 'lucide-react'
import { cn } from '../aceternity/cn'
import type { AgentContext } from '../../lib/logParser'
import { formatFilePath } from '../../lib/logParser'
import type { AgentStatus } from '../../lib/types'

interface AgentContextBarProps {
  /** Agent context extracted from logs */
  context: AgentContext
  /** Current agent status */
  agentStatus: AgentStatus
  /** Optional additional CSS classes */
  className?: string
}

/**
 * Progress bar component for step visualization
 */
function StepProgressBar({
  current,
  total,
  isAnimating,
}: {
  current: number
  total: number
  isAnimating: boolean
}) {
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0

  return (
    <div className="flex items-center gap-2 flex-1">
      <span className="text-xs text-[var(--color-text-tertiary)] font-mono shrink-0">
        {current}/{total}
      </span>
      <div className="flex-1 h-1.5 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
        <motion.div
          className={cn(
            'h-full rounded-full',
            isAnimating
              ? 'bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)]'
              : 'bg-[var(--color-accent-primary)]/60'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs text-[var(--color-text-tertiary)] font-mono shrink-0">
        {percentage.toFixed(0)}%
      </span>
    </div>
  )
}

/**
 * Individual context item with icon and label
 */
function ContextItem({
  icon: Icon,
  label,
  value,
  isActive,
  color = 'default',
}: {
  icon: typeof Wrench
  label: string
  value: string
  isActive?: boolean
  color?: 'default' | 'success' | 'warning' | 'info' | 'accent'
}) {
  const colorClasses = {
    default: 'text-[var(--color-text-secondary)]',
    success: 'text-[var(--color-success)]',
    warning: 'text-[var(--color-warning)]',
    info: 'text-[var(--color-info)]',
    accent: 'text-[var(--color-accent-primary)]',
  }

  const bgColorClasses = {
    default: 'bg-[var(--color-bg-tertiary)]',
    success: 'bg-[var(--color-success)]/10',
    warning: 'bg-[var(--color-warning)]/10',
    info: 'bg-[var(--color-info)]/10',
    accent: 'bg-[var(--color-accent-primary)]/10',
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span
        className={cn(
          'shrink-0 w-6 h-6 flex items-center justify-center rounded-md',
          bgColorClasses[color]
        )}
      >
        <Icon size={14} className={cn(colorClasses[color], isActive && 'animate-pulse')} />
      </span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-xs text-[var(--color-text-tertiary)] shrink-0">{label}:</span>
        <span
          className={cn(
            'text-xs font-medium truncate',
            color === 'default' ? 'text-[var(--color-text-primary)]' : colorClasses[color]
          )}
          title={value}
        >
          {value}
        </span>
      </div>
    </div>
  )
}

export function AgentContextBar({ context, agentStatus, className }: AgentContextBarProps) {
  const isRunning = agentStatus === 'running'
  const isPaused = agentStatus === 'paused'

  // Determine if we have meaningful context to display
  const hasContext = useMemo(() => {
    return (
      context.currentFeature.id !== null ||
      context.currentFeature.name !== null ||
      context.currentTask !== null ||
      context.workingFile !== null ||
      context.lastToolCall !== null
    )
  }, [context])

  // Format feature display text
  const featureDisplay = useMemo(() => {
    if (context.currentFeature.id !== null && context.currentFeature.name) {
      return `#${context.currentFeature.id}: ${context.currentFeature.name}`
    }
    if (context.currentFeature.id !== null) {
      return `Feature #${context.currentFeature.id}`
    }
    if (context.currentFeature.name) {
      return context.currentFeature.name
    }
    return null
  }, [context.currentFeature])

  // Format working file display
  const fileDisplay = useMemo(() => {
    if (!context.workingFile) return null
    return formatFilePath(context.workingFile, true)
  }, [context.workingFile])

  // Don't render if agent is stopped and no context
  if (agentStatus === 'stopped' && !hasContext) {
    return null
  }

  return (
    <AnimatePresence>
      {(isRunning || isPaused || hasContext) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className={cn('overflow-hidden', className)}
        >
          <div
            className={cn(
              'bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3',
              isRunning && 'border-[var(--color-accent-primary)]/30',
              isPaused && 'border-[var(--color-warning)]/30'
            )}
          >
            {/* Header row with feature info */}
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-2">
                {isRunning ? (
                  <Loader2 size={16} className="animate-spin text-[var(--color-accent-primary)]" />
                ) : isPaused ? (
                  <Activity size={16} className="text-[var(--color-warning)]" />
                ) : (
                  <CheckCircle2 size={16} className="text-[var(--color-success)]" />
                )}
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  {isRunning ? 'Agent Working' : isPaused ? 'Agent Paused' : 'Agent Idle'}
                </span>
              </div>

              {/* Feature badge */}
              {featureDisplay && (
                <div
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium',
                    'bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)]'
                  )}
                >
                  <Hash size={12} />
                  <span className="truncate max-w-[200px]" title={featureDisplay}>
                    {featureDisplay}
                  </span>
                </div>
              )}
            </div>

            {/* Context details grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Current task */}
              {context.currentTask && (
                <ContextItem
                  icon={ListChecks}
                  label="Task"
                  value={context.currentTask}
                  isActive={isRunning}
                  color={isRunning ? 'accent' : 'default'}
                />
              )}

              {/* Step progress */}
              {context.stepProgress && (
                <div className="flex items-center gap-2">
                  <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md bg-[var(--color-info)]/10">
                    <Activity size={14} className="text-[var(--color-info)]" />
                  </span>
                  <span className="text-xs text-[var(--color-text-tertiary)] shrink-0">Step:</span>
                  <StepProgressBar
                    current={context.stepProgress.current}
                    total={context.stepProgress.total}
                    isAnimating={isRunning}
                  />
                </div>
              )}

              {/* Working file */}
              {fileDisplay && (
                <ContextItem
                  icon={FileCode}
                  label="File"
                  value={fileDisplay}
                  color="info"
                />
              )}

              {/* Last tool call */}
              {context.lastToolCall && (
                <ContextItem
                  icon={Wrench}
                  label="Tool"
                  value={context.lastToolCall}
                  isActive={isRunning}
                  color={isRunning ? 'warning' : 'default'}
                />
              )}
            </div>

            {/* Empty state when running but no context yet */}
            {isRunning && !hasContext && (
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                <Folder size={14} />
                <span>Waiting for agent activity...</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
