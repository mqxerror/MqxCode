/**
 * ServerTasks Component
 *
 * Panel with quick action buttons for common server tasks and custom command execution.
 * Provides a command center interface for running development operations like
 * linting, building, testing, and agent management.
 */

import { useState, useCallback } from 'react'
import {
  Play,
  RefreshCw,
  Trash2,
  BarChart3,
  Activity,
  Hammer,
  FlaskConical,
  Loader2,
  Terminal,
  AlertTriangle,
  Monitor,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '../aceternity/cn'
import { TaskOutput, type TaskOutputData } from './TaskOutput'
import { runServerTask, getServerHealth } from '@/lib/api'
import type { TaskResult, HealthStatus } from '@/lib/types'

// Allowed commands that users can run (subset of security.py ALLOWED_COMMANDS)
const ALLOWED_USER_COMMANDS = [
  'git',
  'npm',
  'npx',
  'pnpm',
  'node',
  'python',
  'ruff',
  'ls',
  'cat',
  'head',
  'tail',
  'pwd',
  'echo',
]

interface QuickAction {
  id: string
  label: string
  icon: React.ElementType
  task: string
  description: string
  variant?: 'default' | 'warning' | 'danger'
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'lint',
    label: 'Lint',
    icon: Play,
    task: 'lint',
    description: 'Run ruff + eslint',
  },
  {
    id: 'build',
    label: 'Build',
    icon: Hammer,
    task: 'build',
    description: 'Run npm build',
  },
  {
    id: 'tests',
    label: 'Tests',
    icon: FlaskConical,
    task: 'tests',
    description: 'Run test suite',
  },
  {
    id: 'restart',
    label: 'Restart',
    icon: RefreshCw,
    task: 'restart',
    description: 'Restart agent',
    variant: 'warning',
  },
  {
    id: 'clear',
    label: 'Clear',
    icon: Trash2,
    task: 'clear_logs',
    description: 'Clear logs',
  },
  {
    id: 'stats',
    label: 'Stats',
    icon: BarChart3,
    task: 'db_stats',
    description: 'Database stats',
  },
  {
    id: 'health',
    label: 'Health',
    icon: Activity,
    task: 'health',
    description: 'Health check',
  },
]

interface ServerTasksProps {
  projectName: string
  className?: string
}

/**
 * ServerTasks provides a command center for running server operations.
 *
 * Features:
 * - Quick action buttons for common tasks (lint, build, test, etc.)
 * - Custom command input with restricted command validation
 * - Terminal-style output display with exit code status
 * - Real-time health status monitoring
 */
export function ServerTasks({ projectName, className }: ServerTasksProps) {
  const queryClient = useQueryClient()
  const [customCommand, setCustomCommand] = useState('')
  const [taskOutput, setTaskOutput] = useState<TaskOutputData | null>(null)
  const [commandError, setCommandError] = useState<string | null>(null)

  // Health check query - runs periodically when component is visible
  const healthQuery = useQuery({
    queryKey: ['server-health', projectName],
    queryFn: () => getServerHealth(projectName),
    refetchInterval: 30000, // Check every 30 seconds
    staleTime: 10000,
  })

  // Run task mutation
  const runTaskMutation = useMutation({
    mutationFn: ({ task, customCmd }: { task: string; customCmd?: string }) =>
      runServerTask(projectName, task, customCmd),
    onMutate: ({ task, customCmd }) => {
      // Show running state immediately
      setTaskOutput({
        command: customCmd || task,
        output: '',
        exitCode: 0,
        timestamp: new Date(),
        isRunning: true,
      })
      setCommandError(null)
    },
    onSuccess: (result: TaskResult) => {
      setTaskOutput({
        command: result.command,
        output: result.output,
        exitCode: result.exit_code,
        timestamp: new Date(),
        isRunning: false,
      })

      // Invalidate relevant queries after certain tasks
      if (result.command.includes('restart')) {
        queryClient.invalidateQueries({ queryKey: ['agent-status', projectName] })
      }
      if (result.command.includes('stats')) {
        queryClient.invalidateQueries({ queryKey: ['features', projectName] })
      }
    },
    onError: (error: Error) => {
      setTaskOutput({
        command: customCommand || 'unknown',
        output: error.message,
        exitCode: 1,
        timestamp: new Date(),
        isRunning: false,
      })
    },
  })

  // Validate custom command before running
  const validateCommand = useCallback((cmd: string): boolean => {
    if (!cmd.trim()) {
      setCommandError('Please enter a command')
      return false
    }

    // Extract the base command (first word)
    const baseCommand = cmd.trim().split(/\s+/)[0]

    // Check if command is allowed
    if (!ALLOWED_USER_COMMANDS.includes(baseCommand)) {
      setCommandError(
        `Command "${baseCommand}" is not allowed. Allowed: ${ALLOWED_USER_COMMANDS.join(', ')}`
      )
      return false
    }

    setCommandError(null)
    return true
  }, [])

  // Handle quick action click
  const handleQuickAction = (action: QuickAction) => {
    runTaskMutation.mutate({ task: action.task })
  }

  // Handle custom command submission
  const handleRunCustom = () => {
    if (!validateCommand(customCommand)) return
    runTaskMutation.mutate({ task: 'custom', customCmd: customCommand })
  }

  // Handle Enter key in command input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleRunCustom()
    }
  }

  // Get status indicator color based on health
  // Backend returns agent: 'ok' | 'missing', database: 'ok' | 'error: ...', ui: 'ok' | 'not built'
  const getHealthColor = (status: HealthStatus | undefined) => {
    if (!status) return 'var(--color-text-tertiary)'
    if (status.agent === 'missing' || status.database.startsWith('error')) {
      return 'var(--color-danger)'
    }
    if (status.agent === 'ok' && status.database === 'ok') {
      return 'var(--color-success)'
    }
    return 'var(--color-warning)'
  }

  const isRunning = runTaskMutation.isPending

  return (
    <div className={cn(
      "card p-4 space-y-4",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor size={18} className="text-[var(--color-accent-primary)]" />
          <h3 className="font-display font-semibold text-[var(--color-text-primary)]">
            Server Tasks
          </h3>
        </div>

        {/* Health status indicator */}
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: getHealthColor(healthQuery.data) }}
            animate={healthQuery.isLoading ? { opacity: [1, 0.5, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-xs text-[var(--color-text-tertiary)]">
            {healthQuery.isLoading
              ? 'Checking...'
              : healthQuery.data?.agent === 'ok' && healthQuery.data?.database === 'ok'
              ? 'Healthy'
              : healthQuery.data?.agent === 'missing'
              ? 'Agent Missing'
              : healthQuery.data?.database?.startsWith('error')
              ? 'DB Error'
              : healthQuery.data?.agent || 'Unknown'}
          </span>
        </div>
      </div>

      {/* Quick action buttons */}
      <div className="grid grid-cols-4 gap-2">
        {QUICK_ACTIONS.map((action) => (
          <motion.button
            key={action.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleQuickAction(action)}
            disabled={isRunning}
            className={cn(
              "flex flex-col items-center gap-1.5 p-3 rounded-lg",
              "border border-[var(--color-border)] transition-all",
              "hover:border-[var(--color-accent-primary)]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              action.variant === 'warning' && "hover:border-[var(--color-warning)]",
              action.variant === 'danger' && "hover:border-[var(--color-danger)]",
              isRunning && runTaskMutation.variables?.task === action.task
                ? "bg-[var(--color-accent-primary)]/10 border-[var(--color-accent-primary)]"
                : "bg-[var(--color-bg-tertiary)]"
            )}
            title={action.description}
          >
            {isRunning && runTaskMutation.variables?.task === action.task ? (
              <Loader2 size={18} className="animate-spin text-[var(--color-accent-primary)]" />
            ) : (
              <action.icon
                size={18}
                className={cn(
                  "text-[var(--color-text-secondary)]",
                  action.variant === 'warning' && "text-[var(--color-warning)]",
                  action.variant === 'danger' && "text-[var(--color-danger)]"
                )}
              />
            )}
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              {action.label}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Custom command input */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[var(--color-text-secondary)]">
          Custom Command
        </label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Terminal
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]"
            />
            <input
              type="text"
              value={customCommand}
              onChange={(e) => {
                setCustomCommand(e.target.value)
                setCommandError(null)
              }}
              onKeyDown={handleKeyDown}
              placeholder="git status"
              disabled={isRunning}
              className={cn(
                "input pl-9 font-mono text-sm",
                commandError && "border-[var(--color-danger)]"
              )}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRunCustom}
            disabled={isRunning || !customCommand.trim()}
            className={cn(
              "btn btn-primary px-4",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isRunning && runTaskMutation.variables?.task === 'custom' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Play size={16} />
            )}
            <span>Run</span>
          </motion.button>
        </div>

        {/* Allowed commands hint */}
        <div className="flex items-start gap-1.5">
          <AlertTriangle size={12} className="text-[var(--color-warning)] mt-0.5 shrink-0" />
          <span className="text-[10px] text-[var(--color-text-tertiary)]">
            Allowed: {ALLOWED_USER_COMMANDS.slice(0, 6).join(', ')}...
          </span>
        </div>

        {/* Command error */}
        <AnimatePresence>
          {commandError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs text-[var(--color-danger)] bg-[var(--color-danger)]/10 px-3 py-2 rounded-md"
            >
              {commandError}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Output section */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[var(--color-text-secondary)]">
          Output
        </label>
        <TaskOutput data={taskOutput} className="min-h-[150px]" />
      </div>

      {/* Database stats modal (shown when stats task is run and returns data) */}
      <AnimatePresence>
        {taskOutput?.command === 'db_stats' && !taskOutput.isRunning && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4 p-3 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]"
          >
            <h4 className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2">
              Quick Stats
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {['pending', 'in_progress', 'done'].map((status) => (
                <div
                  key={status}
                  className="text-center p-2 rounded-md bg-[var(--color-bg-card)]"
                >
                  <div className="text-lg font-bold text-[var(--color-text-primary)]">
                    --
                  </div>
                  <div className="text-[10px] text-[var(--color-text-tertiary)] capitalize">
                    {status.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export type { TaskOutputData }
