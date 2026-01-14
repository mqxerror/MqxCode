import { useMemo, useState, useEffect } from 'react'
import { Brain, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AgentStatus } from '../lib/types'

interface AgentThoughtProps {
  logs: Array<{ line: string; timestamp: string }>
  agentStatus: AgentStatus
}

const IDLE_TIMEOUT = 30000 // 30 seconds

/**
 * Determines if a log line is an agent "thought" (narrative text)
 * vs. tool mechanics that should be hidden
 */
function isAgentThought(line: string): boolean {
  const trimmed = line.trim()

  // Skip tool mechanics
  if (/^\[Tool:/.test(trimmed)) return false
  if (/^\s*Input:\s*\{/.test(trimmed)) return false
  if (/^\[(Done|Error)\]/.test(trimmed)) return false
  if (/^\[Error\]/.test(trimmed)) return false
  if (/^Output:/.test(trimmed)) return false

  // Skip JSON and very short lines
  if (/^[[{]/.test(trimmed)) return false
  if (trimmed.length < 15) return false

  // Skip lines that are just paths or technical output
  if (/^[A-Za-z]:\\/.test(trimmed)) return false
  if (/^\/[a-z]/.test(trimmed)) return false

  // Keep narrative text (starts with capital, looks like a sentence)
  return /^[A-Z]/.test(trimmed) && trimmed.length > 20
}

/**
 * Extracts the latest agent thought from logs
 */
function getLatestThought(logs: Array<{ line: string; timestamp: string }>): string | null {
  // Search from most recent
  for (let i = logs.length - 1; i >= 0; i--) {
    if (isAgentThought(logs[i].line)) {
      return logs[i].line.trim()
    }
  }
  return null
}

export function AgentThought({ logs, agentStatus }: AgentThoughtProps) {
  const thought = useMemo(() => getLatestThought(logs), [logs])
  const [displayedThought, setDisplayedThought] = useState<string | null>(null)

  // Get last log timestamp for idle detection
  const lastLogTimestamp = logs.length > 0
    ? new Date(logs[logs.length - 1].timestamp).getTime()
    : 0

  // Determine if component should be visible
  const shouldShow = useMemo(() => {
    if (!thought) return false
    if (agentStatus === 'running') return true
    if (agentStatus === 'paused') {
      return Date.now() - lastLogTimestamp < IDLE_TIMEOUT
    }
    return false
  }, [thought, agentStatus, lastLogTimestamp])

  // Update displayed thought
  useEffect(() => {
    if (thought) {
      setDisplayedThought(thought)
    }
  }, [thought])

  const isRunning = agentStatus === 'running'

  return (
    <AnimatePresence>
      {shouldShow && displayedThought && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div
            className={`
              relative overflow-hidden
              bg-[var(--color-bg-card)]
              border border-[var(--color-border)]
              rounded-xl
              px-4 py-3
              flex items-center gap-3
              ${isRunning ? 'border-[var(--color-accent-primary)]/50' : ''}
            `}
          >
            {/* Glow background when running */}
            {isRunning && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{
                  background: [
                    'radial-gradient(circle at 0% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)',
                    'radial-gradient(circle at 100% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)',
                    'radial-gradient(circle at 0% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)',
                  ]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
            )}

            {/* Brain Icon */}
            <div className="relative shrink-0">
              <motion.div
                animate={isRunning ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Brain
                  size={20}
                  className="text-[var(--color-accent-primary)]"
                  strokeWidth={2}
                />
              </motion.div>
              {isRunning && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute -top-1 -right-1"
                >
                  <Sparkles
                    size={10}
                    className="text-[var(--color-warning)]"
                  />
                </motion.div>
              )}
            </div>

            {/* Thought text */}
            <motion.p
              key={displayedThought}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-mono text-sm text-[var(--color-text-secondary)] truncate flex-1"
            >
              {displayedThought?.replace(/:$/, '')}
            </motion.p>

            {/* Running indicator bar */}
            {isRunning && (
              <motion.div
                className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)]"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
