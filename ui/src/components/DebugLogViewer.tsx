/**
 * Debug Log Viewer Component
 *
 * Collapsible panel at the bottom of the screen showing real-time
 * agent output (tool calls, results, steps). Similar to browser DevTools.
 * Features a resizable height via drag handle and tabs for different log sources.
 *
 * Enhanced with:
 * - AgentContextBar showing current feature, task, and step progress
 * - EnhancedLogEntry with semantic parsing, icons, and color-coding
 * - Search with result highlighting and navigation
 * - Collapsible log groups by type
 * - Keyboard shortcuts displayed in tooltips
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Terminal as TerminalIcon,
  GripHorizontal,
  Cpu,
  Server,
  Search,
  X,
  Filter,
  FileText,
  Settings2,
  MonitorCog,
  ChevronLeft,
  ChevronRight,
  Keyboard,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal } from './Terminal'
import { TerminalTabs } from './TerminalTabs'
import { AgentContextBar } from './agent-console/AgentContextBar'
import { EnhancedLogList, LogTypeFilters } from './agent-console/EnhancedLogEntry'
import { SpecViewer } from './spec-viewer'
import { CommandCenter, ServerTasks } from './command-center'
import { listTerminals, createTerminal, renameTerminal, deleteTerminal } from '@/lib/api'
import type { TerminalInfo, AgentStatus, AgentContext, ParsedLogEntry, LogEntryType } from '@/lib/types'
import { cn } from './aceternity/cn'

const MIN_HEIGHT = 150
const MAX_HEIGHT = 600
const DEFAULT_HEIGHT = 288
const STORAGE_KEY = 'debug-panel-height'
const TAB_STORAGE_KEY = 'debug-panel-tab'

type TabType = 'agent' | 'devserver' | 'terminal' | 'spec' | 'config' | 'tasks'

interface DebugLogViewerProps {
  /** Raw log entries */
  logs: Array<{ line: string; timestamp: string }>
  /** Parsed log entries with semantic information */
  parsedLogs?: ParsedLogEntry[]
  /** Raw dev server log entries */
  devLogs: Array<{ line: string; timestamp: string }>
  /** Parsed dev server log entries */
  parsedDevLogs?: ParsedLogEntry[]
  /** Agent context extracted from logs */
  agentContext?: AgentContext
  /** Current agent status */
  agentStatus?: AgentStatus
  /** Whether the panel is open */
  isOpen: boolean
  /** Toggle panel open/closed */
  onToggle: () => void
  /** Clear agent logs */
  onClear: () => void
  /** Clear dev server logs */
  onClearDevLogs: () => void
  /** Callback when panel height changes */
  onHeightChange?: (height: number) => void
  /** Current project name */
  projectName: string
  /** Controlled active tab */
  activeTab?: TabType
  /** Callback when active tab changes */
  onTabChange?: (tab: TabType) => void
  /** Sidebar width offset for positioning */
  sidebarWidth?: number
}

type LogLevel = 'error' | 'warn' | 'debug' | 'info'

// Keyboard shortcuts reference
const KEYBOARD_SHORTCUTS = [
  { key: 'D', description: 'Toggle debug panel' },
  { key: 'T', description: 'Toggle terminal tab' },
  { key: 'Esc', description: 'Close panel/search' },
  { key: 'Ctrl+F', description: 'Search in logs' },
]

export function DebugLogViewer({
  logs,
  parsedLogs,
  devLogs,
  parsedDevLogs,
  agentContext,
  agentStatus = 'stopped',
  isOpen,
  onToggle,
  onClear,
  onClearDevLogs,
  onHeightChange,
  projectName,
  activeTab: controlledActiveTab,
  onTabChange,
  sidebarWidth = 0,
}: DebugLogViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const devScrollRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
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

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedFilterTypes, setSelectedFilterTypes] = useState<LogEntryType[]>([])
  const [showShortcuts, setShowShortcuts] = useState(false)

  // Search navigation state
  const [searchMatchCount, setSearchMatchCount] = useState(0)
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0)

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

  // Default agent context when not provided
  const defaultAgentContext: AgentContext = useMemo(() => ({
    currentFeature: { id: null, name: null },
    currentTask: null,
    stepProgress: null,
    workingFile: null,
    lastToolCall: null,
    lastActivityTime: null,
  }), [])

  const effectiveAgentContext = agentContext ?? defaultAgentContext

  // Count search matches
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchMatchCount(0)
      setCurrentSearchIndex(0)
      return
    }

    const entries = activeTab === 'agent' ? (parsedLogs || []) : (parsedDevLogs || [])
    const term = searchTerm.toLowerCase()
    const matches = entries.filter(entry =>
      entry.text.toLowerCase().includes(term) ||
      entry.rawText.toLowerCase().includes(term)
    ).length

    setSearchMatchCount(matches)
    setCurrentSearchIndex(matches > 0 ? 1 : 0)
  }, [searchTerm, parsedLogs, parsedDevLogs, activeTab])

  // Navigate between search results
  const navigateSearch = useCallback((direction: 'prev' | 'next') => {
    if (searchMatchCount === 0) return

    if (direction === 'next') {
      setCurrentSearchIndex(prev => prev >= searchMatchCount ? 1 : prev + 1)
    } else {
      setCurrentSearchIndex(prev => prev <= 1 ? searchMatchCount : prev - 1)
    }
  }, [searchMatchCount])

  // Toggle filter type selection
  const handleFilterTypeToggle = useCallback((type: LogEntryType) => {
    setSelectedFilterTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }, [])

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSelectedFilterTypes([])
  }, [])

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

  // Keyboard shortcuts for search
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && (activeTab === 'agent' || activeTab === 'devserver')) {
        e.preventDefault()
        setShowSearch(true)
        setTimeout(() => searchInputRef.current?.focus(), 50)
      }

      // Enter/Shift+Enter to navigate search results
      if (showSearch && searchMatchCount > 0) {
        if (e.key === 'Enter') {
          e.preventDefault()
          navigateSearch(e.shiftKey ? 'prev' : 'next')
        }
      }

      // Escape to close search
      if (e.key === 'Escape' && showSearch) {
        e.preventDefault()
        setShowSearch(false)
        setSearchTerm('')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, activeTab, showSearch, searchMatchCount])

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

  // Legacy log rendering for fallback when parsedLogs not provided
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
    { id: 'agent', label: 'Agent', icon: Cpu, count: logs.length, shortcut: 'D' },
    { id: 'devserver', label: 'Dev Server', icon: Server, count: devLogs.length },
    { id: 'terminal', label: 'Terminal', icon: TerminalIcon, shortcut: 'T' },
    { id: 'spec', label: 'Spec', icon: FileText },
    { id: 'config', label: 'Config', icon: Settings2 },
    { id: 'tasks', label: 'Tasks', icon: MonitorCog },
  ]

  // Determine if we should use enhanced log display
  const useEnhancedLogs = parsedLogs && parsedLogs.length > 0
  const useEnhancedDevLogs = parsedDevLogs && parsedDevLogs.length > 0

  return (
    <motion.div
      className={cn(
        "fixed bottom-0 right-0 z-40",
        !isResizing && "transition-all duration-300"
      )}
      style={{
        height: isOpen ? panelHeight : 44,
        left: sidebarWidth,
      }}
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
            title="Toggle debug panel (D)"
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
                    title={tab.shortcut ? `${tab.label} (${tab.shortcut})` : tab.label}
                  >
                    <tab.icon size={12} />
                    <span className="hidden sm:inline">{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-[var(--color-bg-tertiary)] rounded-full">{tab.count}</span>
                    )}
                    {tab.shortcut && (
                      <span className="hidden lg:inline px-1 py-0.5 text-[10px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] rounded">{tab.shortcut}</span>
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
          {/* Search and filter controls for agent/devserver tabs */}
          {isOpen && (activeTab === 'agent' || activeTab === 'devserver') && (
            <>
              {/* Search toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowSearch(!showSearch); setShowFilters(false) }}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  showSearch
                    ? "bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)]"
                    : "hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]"
                )}
                title="Search logs (Ctrl+F)"
              >
                <Search size={14} />
              </button>

              {/* Filter toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowFilters(!showFilters); setShowSearch(false) }}
                className={cn(
                  "relative p-2 rounded-lg transition-colors",
                  showFilters || selectedFilterTypes.length > 0
                    ? "bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)]"
                    : "hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]"
                )}
                title="Filter logs by type"
              >
                <Filter size={14} />
                {selectedFilterTypes.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] bg-[var(--color-accent-primary)] text-white rounded-full flex items-center justify-center">
                    {selectedFilterTypes.length}
                  </span>
                )}
              </button>

              {/* Keyboard shortcuts */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowShortcuts(!showShortcuts) }}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  showShortcuts
                    ? "bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)]"
                    : "hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]"
                )}
                title="Keyboard shortcuts"
              >
                <Keyboard size={14} />
              </button>

              {/* Clear logs */}
              <button
                onClick={(e) => { e.stopPropagation(); handleClear() }}
                className="p-2 hover:bg-[var(--color-bg-tertiary)] rounded-lg transition-colors"
                title="Clear logs"
              >
                <Trash2 size={14} className="text-[var(--color-text-tertiary)]" />
              </button>
            </>
          )}
          <button onClick={onToggle} className="p-1" title={isOpen ? "Collapse panel" : "Expand panel"}>
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
            className="h-[calc(100%-2.75rem)] bg-[var(--color-bg-primary)] flex flex-col"
          >
            {/* Search bar with navigation (shown when search is active) */}
            <AnimatePresence>
              {showSearch && (activeTab === 'agent' || activeTab === 'devserver') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
                >
                  <div className="flex items-center gap-2 px-3 py-2">
                    <Search size={14} className="text-[var(--color-text-tertiary)]" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search logs... (Enter to navigate, Esc to close)"
                      className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none"
                      autoFocus
                    />

                    {/* Search result navigation */}
                    {searchMatchCount > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                          {currentSearchIndex}/{searchMatchCount}
                        </span>
                        <button
                          onClick={() => navigateSearch('prev')}
                          className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded"
                          title="Previous match (Shift+Enter)"
                        >
                          <ChevronLeft size={14} className="text-[var(--color-text-tertiary)]" />
                        </button>
                        <button
                          onClick={() => navigateSearch('next')}
                          className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded"
                          title="Next match (Enter)"
                        >
                          <ChevronRight size={14} className="text-[var(--color-text-tertiary)]" />
                        </button>
                      </div>
                    )}

                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded"
                        title="Clear search"
                      >
                        <X size={12} className="text-[var(--color-text-tertiary)]" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Filter bar (shown when filters are active) */}
            <AnimatePresence>
              {showFilters && (activeTab === 'agent' || activeTab === 'devserver') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
                >
                  <div className="px-3 py-2">
                    <LogTypeFilters
                      selectedTypes={selectedFilterTypes}
                      onTypeToggle={handleFilterTypeToggle}
                      onClearFilters={handleClearFilters}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Keyboard shortcuts panel */}
            <AnimatePresence>
              {showShortcuts && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
                >
                  <div className="px-3 py-2 flex flex-wrap gap-3">
                    {KEYBOARD_SHORTCUTS.map((shortcut) => (
                      <div key={shortcut.key} className="flex items-center gap-2 text-xs">
                        <kbd className="px-1.5 py-0.5 bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] rounded font-mono border border-[var(--color-border)]">
                          {shortcut.key}
                        </kbd>
                        <span className="text-[var(--color-text-tertiary)]">{shortcut.description}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Agent Logs Tab */}
            {activeTab === 'agent' && (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Agent Context Bar */}
                {agentContext && (
                  <div className="px-3 pt-2">
                    <AgentContextBar
                      context={effectiveAgentContext}
                      agentStatus={agentStatus}
                    />
                  </div>
                )}

                {/* Log entries */}
                <div
                  ref={scrollRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto p-3 font-mono text-sm scrollbar-thin"
                >
                  {useEnhancedLogs ? (
                    <EnhancedLogList
                      entries={parsedLogs}
                      isActive={agentStatus === 'running'}
                      filterTypes={selectedFilterTypes.length > 0 ? selectedFilterTypes : undefined}
                      searchTerm={searchTerm || undefined}
                    />
                  ) : logs.length === 0 ? (
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
              </div>
            )}

            {/* Dev Server Logs Tab */}
            {activeTab === 'devserver' && (
              <div
                ref={devScrollRef}
                onScroll={handleDevScroll}
                className="flex-1 overflow-y-auto p-3 font-mono text-sm scrollbar-thin"
              >
                {useEnhancedDevLogs ? (
                  <EnhancedLogList
                    entries={parsedDevLogs}
                    filterTypes={selectedFilterTypes.length > 0 ? selectedFilterTypes : undefined}
                    searchTerm={searchTerm || undefined}
                  />
                ) : devLogs.length === 0 ? (
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
              <div className="flex-1 flex flex-col min-h-0">
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
                <div className="flex-1 min-h-0 relative rounded-lg overflow-hidden shadow-[0_0_20px_rgba(99,102,241,0.15)]">
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

            {/* Spec Viewer Tab */}
            {activeTab === 'spec' && (
              <div className="flex-1 overflow-hidden">
                <SpecViewer projectName={projectName} className="h-full" />
              </div>
            )}

            {/* Config Tab */}
            {activeTab === 'config' && (
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                <CommandCenter />
              </div>
            )}

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
              <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                <ServerTasks projectName={projectName} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export type { TabType }
