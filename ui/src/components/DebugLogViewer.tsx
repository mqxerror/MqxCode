/**
 * Debug Log Viewer Component
 *
 * Collapsible panel at the bottom of the screen showing real-time
 * agent output (tool calls, results, steps). Similar to browser DevTools.
 * Features a resizable height via drag handle and tabs for different log sources.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { ChevronUp, ChevronDown, Trash2, Terminal as TerminalIcon, GripHorizontal, Cpu, Server } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal } from './Terminal'
import { TerminalTabs } from './TerminalTabs'
import { listTerminals, createTerminal, renameTerminal, deleteTerminal } from '@/lib/api'
import type { TerminalInfo } from '@/lib/types'
import { cn } from './aceternity/cn'

const MIN_HEIGHT = 150
const MAX_HEIGHT = 600
const DEFAULT_HEIGHT = 288
const STORAGE_KEY = 'debug-panel-height'
const TAB_STORAGE_KEY = 'debug-panel-tab'

type TabType = 'agent' | 'devserver' | 'terminal'

interface DebugLogViewerProps {
  logs: Array<{ line: string; timestamp: string }>
  devLogs: Array<{ line: string; timestamp: string }>
  isOpen: boolean
  onToggle: () => void
  onClear: () => void
  onClearDevLogs: () => void
  onHeightChange?: (height: number) => void
  projectName: string
  activeTab?: TabType
  onTabChange?: (tab: TabType) => void
}

type LogLevel = 'error' | 'warn' | 'debug' | 'info'

export function DebugLogViewer({
  logs,
  devLogs,
  isOpen,
  onToggle,
  onClear,
  onClearDevLogs,
  onHeightChange,
  projectName,
  activeTab: controlledActiveTab,
  onTabChange,
}: DebugLogViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const devScrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [devAutoScroll, setDevAutoScroll] = useState(true)
  const [isResizing, setIsResizing] = useState(false)
  const [panelHeight, setPanelHeight] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? Math.min(Math.max(parseInt(saved, 10), MIN_HEIGHT), MAX_HEIGHT) : DEFAULT_HEIGHT
  })
  const [internalActiveTab, setInternalActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem(TAB_STORAGE_KEY)
    return (saved as TabType) || 'agent'
  })

  // Terminal management state
  const [terminals, setTerminals] = useState<TerminalInfo[]>([])
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null)
  const [isLoadingTerminals, setIsLoadingTerminals] = useState(false)

  // Use controlled tab if provided, otherwise use internal state
  const activeTab = controlledActiveTab ?? internalActiveTab
  const setActiveTab = (tab: TabType) => {
    setInternalActiveTab(tab)
    localStorage.setItem(TAB_STORAGE_KEY, tab)
    onTabChange?.(tab)
  }

  // Fetch terminals for the project
  const fetchTerminals = useCallback(async () => {
    if (!projectName) return
    setIsLoadingTerminals(true)
    try {
      const terminalList = await listTerminals(projectName)
      setTerminals(terminalList)
      if (terminalList.length > 0) {
        if (!activeTerminalId || !terminalList.find((t) => t.id === activeTerminalId)) {
          setActiveTerminalId(terminalList[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to fetch terminals:', err)
    } finally {
      setIsLoadingTerminals(false)
    }
  }, [projectName, activeTerminalId])

  const handleCreateTerminal = useCallback(async () => {
    if (!projectName) return
    try {
      const newTerminal = await createTerminal(projectName)
      setTerminals((prev) => [...prev, newTerminal])
      setActiveTerminalId(newTerminal.id)
    } catch (err) {
      console.error('Failed to create terminal:', err)
    }
  }, [projectName])

  const handleRenameTerminal = useCallback(
    async (terminalId: string, newName: string) => {
      if (!projectName) return
      try {
        const updated = await renameTerminal(projectName, terminalId, newName)
        setTerminals((prev) => prev.map((t) => (t.id === terminalId ? updated : t)))
      } catch (err) {
        console.error('Failed to rename terminal:', err)
      }
    },
    [projectName]
  )

  const handleCloseTerminal = useCallback(
    async (terminalId: string) => {
      if (!projectName || terminals.length <= 1) return
      try {
        await deleteTerminal(projectName, terminalId)
        setTerminals((prev) => prev.filter((t) => t.id !== terminalId))
        if (activeTerminalId === terminalId) {
          const remaining = terminals.filter((t) => t.id !== terminalId)
          if (remaining.length > 0) {
            setActiveTerminalId(remaining[0].id)
          }
        }
      } catch (err) {
        console.error('Failed to close terminal:', err)
      }
    },
    [projectName, terminals, activeTerminalId]
  )

  useEffect(() => {
    if (projectName) {
      fetchTerminals()
    } else {
      setTerminals([])
      setActiveTerminalId(null)
    }
  }, [projectName]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (autoScroll && scrollRef.current && isOpen && activeTab === 'agent') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, autoScroll, isOpen, activeTab])

  useEffect(() => {
    if (devAutoScroll && devScrollRef.current && isOpen && activeTab === 'devserver') {
      devScrollRef.current.scrollTop = devScrollRef.current.scrollHeight
    }
  }, [devLogs, devAutoScroll, isOpen, activeTab])

  useEffect(() => {
    if (onHeightChange && isOpen) {
      onHeightChange(panelHeight)
    }
  }, [panelHeight, isOpen, onHeightChange])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const newHeight = window.innerHeight - e.clientY
    const clampedHeight = Math.min(Math.max(newHeight, MIN_HEIGHT), MAX_HEIGHT)
    setPanelHeight(clampedHeight)
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
    localStorage.setItem(STORAGE_KEY, panelHeight.toString())
  }, [panelHeight])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'ns-resize'
      document.body.style.userSelect = 'none'
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 50
    setAutoScroll(isAtBottom)
  }

  const handleDevScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 50
    setDevAutoScroll(isAtBottom)
  }

  const handleClear = () => {
    if (activeTab === 'agent') onClear()
    else if (activeTab === 'devserver') onClearDevLogs()
  }

  const isAutoScrollPaused = () => {
    if (activeTab === 'agent') return !autoScroll
    if (activeTab === 'devserver') return !devAutoScroll
    return false
  }

  const getLogLevel = (line: string): LogLevel => {
    const lowerLine = line.toLowerCase()
    if (lowerLine.includes('error') || lowerLine.includes('exception') || lowerLine.includes('traceback')) return 'error'
    if (lowerLine.includes('warn') || lowerLine.includes('warning')) return 'warn'
    if (lowerLine.includes('debug')) return 'debug'
    return 'info'
  }

  const getLogColor = (level: LogLevel): string => {
    switch (level) {
      case 'error': return 'text-red-400'
      case 'warn': return 'text-amber-400'
      case 'debug': return 'text-zinc-500'
      case 'info':
      default: return 'text-emerald-400'
    }
  }

  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch {
      return ''
    }
  }

  const tabs = [
    { id: 'agent', label: 'Agent', icon: Cpu, count: logs.length },
    { id: 'devserver', label: 'Dev Server', icon: Server, count: devLogs.length },
    { id: 'terminal', label: 'Terminal', icon: TerminalIcon, shortcut: 'T' },
  ]

  return (
    <motion.div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        !isResizing && "transition-all duration-200"
      )}
      style={{ height: isOpen ? panelHeight : 44 }}
      initial={false}
    >
      {/* Resize handle */}
      {isOpen && (
        <div
          className="absolute top-0 left-0 right-0 h-3 cursor-ns-resize group flex items-center justify-center -translate-y-1/2 z-50"
          onMouseDown={handleResizeStart}
        >
          <div className="w-20 h-1 bg-[var(--color-border)] rounded-full group-hover:bg-[var(--color-accent-primary)] transition-colors flex items-center justify-center">
            <GripHorizontal size={12} className="text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent-primary)]" />
          </div>
        </div>
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between h-11 px-4 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          {/* Toggle button */}
          <button
            onClick={onToggle}
            className="flex items-center gap-2 hover:bg-[var(--color-bg-tertiary)] px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <TerminalIcon size={16} className="text-[var(--color-accent-primary)]" />
            <span className="font-medium text-sm text-[var(--color-text-primary)]">Debug</span>
            <span className="px-1.5 py-0.5 text-[10px] font-mono bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] rounded">D</span>
          </button>

          {/* Tabs */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-1 ml-2"
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={(e) => { e.stopPropagation(); setActiveTab(tab.id as TabType) }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                      activeTab === tab.id
                        ? "bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-sm"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
                    )}
                  >
                    <tab.icon size={12} />
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-[var(--color-bg-tertiary)] rounded-full">{tab.count}</span>
                    )}
                    {tab.shortcut && (
                      <span className="px-1 py-0.5 text-[10px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] rounded">{tab.shortcut}</span>
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status indicators */}
          {isOpen && activeTab !== 'terminal' && (
            <div className="flex items-center gap-2 ml-2">
              {isAutoScrollPaused() && (
                <span className="px-2 py-0.5 text-xs font-medium bg-[var(--color-warning)]/20 text-[var(--color-warning)] rounded-full">Paused</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isOpen && activeTab !== 'terminal' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleClear() }}
              className="p-2 hover:bg-[var(--color-bg-tertiary)] rounded-lg transition-colors"
              title="Clear logs"
            >
              <Trash2 size={14} className="text-[var(--color-text-tertiary)]" />
            </button>
          )}
          <button onClick={onToggle} className="p-1">
            {isOpen ? <ChevronDown size={16} className="text-[var(--color-text-tertiary)]" /> : <ChevronUp size={16} className="text-[var(--color-text-tertiary)]" />}
          </button>
        </div>
      </div>

      {/* Content area */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-[calc(100%-2.75rem)] bg-[var(--color-bg-primary)]"
          >
            {/* Agent Logs Tab */}
            {activeTab === 'agent' && (
              <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto p-3 font-mono text-sm scrollbar-thin">
                {logs.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-[var(--color-text-tertiary)]">
                    No logs yet. Start the agent to see output.
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {logs.map((log, index) => (
                      <div key={`${log.timestamp}-${index}`} className="flex gap-3 hover:bg-[var(--color-bg-secondary)] px-2 py-1 rounded-lg">
                        <span className="text-[var(--color-text-tertiary)] select-none shrink-0 text-xs">{formatTimestamp(log.timestamp)}</span>
                        <span className={cn(getLogColor(getLogLevel(log.line)), "whitespace-pre-wrap break-all text-xs")}>{log.line}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Dev Server Logs Tab */}
            {activeTab === 'devserver' && (
              <div ref={devScrollRef} onScroll={handleDevScroll} className="h-full overflow-y-auto p-3 font-mono text-sm scrollbar-thin">
                {devLogs.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-[var(--color-text-tertiary)]">No dev server logs yet.</div>
                ) : (
                  <div className="space-y-0.5">
                    {devLogs.map((log, index) => (
                      <div key={`${log.timestamp}-${index}`} className="flex gap-3 hover:bg-[var(--color-bg-secondary)] px-2 py-1 rounded-lg">
                        <span className="text-[var(--color-text-tertiary)] select-none shrink-0 text-xs">{formatTimestamp(log.timestamp)}</span>
                        <span className={cn(getLogColor(getLogLevel(log.line)), "whitespace-pre-wrap break-all text-xs")}>{log.line}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Terminal Tab */}
            {activeTab === 'terminal' && (
              <div className="h-full flex flex-col">
                {terminals.length > 0 && (
                  <TerminalTabs
                    terminals={terminals}
                    activeTerminalId={activeTerminalId}
                    onSelect={setActiveTerminalId}
                    onCreate={handleCreateTerminal}
                    onRename={handleRenameTerminal}
                    onClose={handleCloseTerminal}
                  />
                )}
                <div className="flex-1 min-h-0 relative">
                  {isLoadingTerminals ? (
                    <div className="h-full flex items-center justify-center text-[var(--color-text-tertiary)] font-mono text-sm">Loading terminals...</div>
                  ) : terminals.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[var(--color-text-tertiary)] font-mono text-sm">No terminal available</div>
                  ) : (
                    terminals.map((terminal) => {
                      const isActiveTerminal = terminal.id === activeTerminalId
                      return (
                        <div
                          key={terminal.id}
                          className="absolute inset-0"
                          style={{
                            zIndex: isActiveTerminal ? 10 : 1,
                            transform: isActiveTerminal ? 'none' : 'translateX(-200%)',
                            pointerEvents: isActiveTerminal ? 'auto' : 'none',
                          }}
                        >
                          <Terminal projectName={projectName} terminalId={terminal.id} isActive={activeTab === 'terminal' && isActiveTerminal} />
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export type { TabType }
