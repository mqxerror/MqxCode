/**
 * TaskOutput Component
 *
 * Terminal-style output display for server task execution results.
 * Shows the command that was run, the output, and exit code status.
 * Features auto-scroll, copy functionality, and neobrutalism styling.
 */

import { useEffect, useRef, useState } from 'react'
import { Copy, Check, ChevronDown, XCircle, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../aceternity/cn'

export interface TaskOutputData {
  command: string
  output: string
  exitCode: number
  timestamp: Date
  isRunning?: boolean
}

interface TaskOutputProps {
  data: TaskOutputData | null
  className?: string
}

/**
 * Formats terminal output with ANSI color code support removed.
 * Preserves whitespace and newlines for proper terminal rendering.
 */
function stripAnsiCodes(text: string): string {
  // Remove ANSI escape codes for color/formatting
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, '')
}

/**
 * TaskOutput displays command execution results in a terminal-like interface.
 *
 * Features:
 * - Dark terminal background with monospace font
 * - Shows the executed command with $ prefix
 * - Auto-scrolls to bottom as output streams
 * - Exit code indicator (green checkmark for 0, red X for non-zero)
 * - Copy output button
 */
export function TaskOutput({ data, className }: TaskOutputProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (autoScroll && scrollRef.current && data?.output) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [data?.output, autoScroll])

  // Handle manual scroll to pause auto-scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 20
    setAutoScroll(isAtBottom)
  }

  // Copy output to clipboard
  const handleCopy = async () => {
    if (!data?.output) return

    try {
      await navigator.clipboard.writeText(data.output)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy output:', err)
    }
  }

  // Empty state when no data
  if (!data) {
    return (
      <div className={cn(
        "bg-[#1a1a1a] rounded-lg border border-[var(--color-border)] p-4",
        "flex items-center justify-center min-h-[120px]",
        className
      )}>
        <span className="text-[var(--color-text-tertiary)] font-mono text-sm">
          No output yet. Run a task to see results.
        </span>
      </div>
    )
  }

  const isSuccess = data.exitCode === 0
  const cleanOutput = stripAnsiCodes(data.output)

  return (
    <div className={cn(
      "bg-[#1a1a1a] rounded-lg border border-[var(--color-border)] overflow-hidden",
      "flex flex-col",
      className
    )}>
      {/* Header with command and status */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#252525] border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-[var(--color-accent-primary)] font-mono text-xs shrink-0">$</span>
          <span className="font-mono text-xs text-[var(--color-text-primary)] truncate">
            {data.command}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Running/Exit status indicator */}
          {data.isRunning ? (
            <motion.div
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--color-accent-primary)]/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="w-2 h-2 rounded-full bg-[var(--color-accent-primary)]"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="text-xs font-mono text-[var(--color-accent-primary)]">Running</span>
            </motion.div>
          ) : (
            <motion.div
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md",
                isSuccess
                  ? "bg-[var(--color-success)]/20"
                  : "bg-[var(--color-danger)]/20"
              )}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              {isSuccess ? (
                <CheckCircle2 size={14} className="text-[var(--color-success)]" />
              ) : (
                <XCircle size={14} className="text-[var(--color-danger)]" />
              )}
              <span className={cn(
                "text-xs font-mono",
                isSuccess ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
              )}>
                {isSuccess ? 'OK' : `Exit ${data.exitCode}`}
              </span>
            </motion.div>
          )}

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              "hover:bg-[var(--color-bg-tertiary)]",
              copied && "bg-[var(--color-success)]/20"
            )}
            title={copied ? "Copied!" : "Copy output"}
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Check size={14} className="text-[var(--color-success)]" />
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Copy size={14} className="text-[var(--color-text-tertiary)]" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Output content */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 min-h-[100px] max-h-[300px] scrollbar-thin"
      >
        {cleanOutput ? (
          <pre className="font-mono text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap break-words">
            {cleanOutput}
          </pre>
        ) : (
          <span className="font-mono text-xs text-[var(--color-text-tertiary)]">
            (no output)
          </span>
        )}
      </div>

      {/* Auto-scroll indicator */}
      <AnimatePresence>
        {!autoScroll && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => {
              setAutoScroll(true)
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight
              }
            }}
            className={cn(
              "absolute bottom-3 right-3 flex items-center gap-1",
              "px-2 py-1 rounded-md",
              "bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]",
              "text-xs font-mono text-[var(--color-text-secondary)]",
              "hover:bg-[var(--color-bg-elevated)] transition-colors"
            )}
          >
            <ChevronDown size={12} />
            Scroll to bottom
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
