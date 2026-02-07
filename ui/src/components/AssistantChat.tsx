/**
 * Assistant Chat Component
 *
 * Main chat interface for the project assistant.
 * Displays messages and handles user input.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, WifiOff, Paperclip, X, RotateCcw, Scissors, Download, Square, AlertTriangle, History } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAssistantChat } from '../hooks/useAssistantChat'
import { ChatMessage } from './ChatMessage'
import type { ImageAttachment } from '../lib/types'

// Image upload validation constants
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png']

// Message length validation
const MAX_MESSAGE_LENGTH = 100000 // ~100K chars - reasonable limit for user messages
const WARN_MESSAGE_LENGTH = 50000 // Warn user above this

// Timeout for detecting stuck state (60 seconds)
const STUCK_TIMEOUT_MS = 60000

// Context window estimation (Claude has ~200K tokens, ~4 chars per token)
const ESTIMATED_CONTEXT_CHARS = 200000 * 4 // ~800K chars
const CONTEXT_WARNING_THRESHOLD = 0.7 // Warn at 70%
const CONTEXT_DANGER_THRESHOLD = 0.9 // Danger at 90%

// Local storage key for conversation history
const STORAGE_KEY_PREFIX = 'assistant-conversations-'

interface AssistantChatProps {
  projectName: string
}

// Saved conversation type
interface SavedConversation {
  id: string
  timestamp: number
  messageCount: number
  preview: string
  messages: Array<{
    id: string
    role: string
    content: string
    timestamp?: Date
  }>
}

export function AssistantChat({ projectName }: AssistantChatProps) {
  const [inputValue, setInputValue] = useState('')
  const [pendingAttachments, setPendingAttachments] = useState<ImageAttachment[]>([])
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [isStuck, setIsStuck] = useState(false)
  const [savedConversations, setSavedConversations] = useState<SavedConversation[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasStartedRef = useRef(false)
  const stuckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const storageKey = `${STORAGE_KEY_PREFIX}${projectName}`

  // Memoize the error handler to prevent infinite re-renders
  const handleError = useCallback((error: string) => {
    console.error('Assistant error:', error)
    setIsStuck(false)
  }, [])

  const {
    messages,
    isLoading,
    connectionStatus,
    start,
    sendMessage,
    clearMessages,
    disconnect,
    restoreMessages,
  } = useAssistantChat({
    projectName,
    onError: handleError,
  })

  // Stuck detection - if loading for too long, show warning
  useEffect(() => {
    if (isLoading) {
      stuckTimeoutRef.current = setTimeout(() => {
        setIsStuck(true)
      }, STUCK_TIMEOUT_MS)
    } else {
      setIsStuck(false)
      if (stuckTimeoutRef.current) {
        clearTimeout(stuckTimeoutRef.current)
        stuckTimeoutRef.current = null
      }
    }
    return () => {
      if (stuckTimeoutRef.current) {
        clearTimeout(stuckTimeoutRef.current)
      }
    }
  }, [isLoading])

  // Save conversation to file
  const handleSave = useCallback(() => {
    if (messages.length === 0) return

    const content = messages.map(msg => {
      const time = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''
      const role = msg.role.toUpperCase()
      return `[${time}] ${role}:\n${msg.content}\n`
    }).join('\n---\n\n')

    const blob = new Blob([`# Assistant Conversation - ${projectName}\n# Exported: ${new Date().toLocaleString()}\n\n${content}`], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `assistant-chat-${projectName}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [messages, projectName])

  // Force stop - disconnect and reconnect
  const handleForceStop = useCallback(() => {
    disconnect()
    setIsStuck(false)
    // Reconnect after a brief delay
    setTimeout(() => {
      hasStartedRef.current = false
      start()
    }, 500)
  }, [disconnect, start])

  // Calculate context usage
  const contextUsage = useCallback(() => {
    const totalChars = messages.reduce((acc, msg) => acc + (msg.content?.length || 0), 0)
    const percentage = (totalChars / ESTIMATED_CONTEXT_CHARS) * 100
    return {
      chars: totalChars,
      percentage: Math.min(percentage, 100),
      level: percentage >= CONTEXT_DANGER_THRESHOLD * 100 ? 'danger' :
             percentage >= CONTEXT_WARNING_THRESHOLD * 100 ? 'warning' : 'normal'
    }
  }, [messages])

  // Load saved conversations on mount and auto-restore current conversation
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const conversations: SavedConversation[] = JSON.parse(saved)
        setSavedConversations(conversations)

        // Auto-restore the current conversation if it exists
        const currentConvo = conversations.find(c => c.id === `current-${projectName}`)
        if (currentConvo && currentConvo.messages.length > 0) {
          const restoredMessages = currentConvo.messages.map(m => ({
            id: m.id,
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
            isStreaming: false,
          }))
          restoreMessages(restoredMessages)
          hasStartedRef.current = true // Don't auto-start, user can continue or reset
        }
      }
    } catch (e) {
      console.error('Failed to load saved conversations:', e)
    }
  }, [storageKey, projectName, restoreMessages])

  // Immediate save function - saves current conversation to localStorage
  const saveCurrentConversation = useCallback(() => {
    if (messages.length < 2) return // Don't save empty or single message conversations

    const currentId = `current-${projectName}`
    const preview = messages[messages.length - 1]?.content?.slice(0, 100) || ''

    const currentConvo: SavedConversation = {
      id: currentId,
      timestamp: Date.now(),
      messageCount: messages.length,
      preview,
      messages: messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      }))
    }

    setSavedConversations(prev => {
      const filtered = prev.filter(c => c.id !== currentId)
      const updated = [currentConvo, ...filtered].slice(0, 10) // Keep max 10 conversations
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated))
      } catch (e) {
        console.error('Failed to save conversation:', e)
      }
      return updated
    })
  }, [messages, projectName, storageKey])

  // Auto-save when messages change (debounced to avoid excessive writes)
  useEffect(() => {
    if (messages.length < 2) return

    const timer = setTimeout(saveCurrentConversation, 1000) // Save after 1 second
    return () => clearTimeout(timer)
  }, [messages, saveCurrentConversation])

  // Save before page unload (refresh/close)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (messages.length >= 2) {
        // Synchronous save - use JSON directly since state updates won't work
        const currentId = `current-${projectName}`
        const preview = messages[messages.length - 1]?.content?.slice(0, 100) || ''

        const currentConvo: SavedConversation = {
          id: currentId,
          timestamp: Date.now(),
          messageCount: messages.length,
          preview,
          messages: messages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp
          }))
        }

        try {
          const saved = localStorage.getItem(storageKey)
          const existing: SavedConversation[] = saved ? JSON.parse(saved) : []
          const filtered = existing.filter(c => c.id !== currentId)
          const updated = [currentConvo, ...filtered].slice(0, 10)
          localStorage.setItem(storageKey, JSON.stringify(updated))
        } catch (e) {
          console.error('Failed to save on unload:', e)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [messages, projectName, storageKey])

  // Save conversation before reset/compact
  const saveBeforeAction = useCallback(() => {
    if (messages.length < 2) return

    const preview = messages[messages.length - 1]?.content?.slice(0, 100) || ''
    const newConvo: SavedConversation = {
      id: `saved-${Date.now()}`,
      timestamp: Date.now(),
      messageCount: messages.length,
      preview,
      messages: messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      }))
    }

    setSavedConversations(prev => {
      // Remove 'current' entry and add as saved
      const filtered = prev.filter(c => !c.id.startsWith('current-'))
      const updated = [newConvo, ...filtered].slice(0, 10)
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated))
      } catch (e) {
        console.error('Failed to save conversation:', e)
      }
      return updated
    })
  }, [messages, storageKey])

  // Load a saved conversation
  const loadConversation = useCallback((convo: SavedConversation) => {
    setShowHistory(false)

    // Restore the messages from saved conversation
    const restoredMessages = convo.messages.map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
      timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
      isStreaming: false,
    }))

    restoreMessages(restoredMessages)

    // Don't auto-start after restore - let user continue from where they left off
    hasStartedRef.current = true
  }, [restoreMessages])

  // Reset context - save then clear messages and start fresh
  const handleReset = useCallback(() => {
    if (isLoading) return
    saveBeforeAction() // Auto-save before reset
    clearMessages()
    hasStartedRef.current = false
    // Restart with new session
    setTimeout(() => {
      hasStartedRef.current = true
      start()
    }, 100)
  }, [isLoading, clearMessages, start, saveBeforeAction])

  // Compact context - save then summarize older messages
  const handleCompact = useCallback(() => {
    if (isLoading || messages.length <= 10) return
    saveBeforeAction() // Auto-save before compact
    // Send a compact request that summarizes older messages
    sendMessage("[System: Please provide a brief summary of our conversation so far, then we can continue from there.]")
  }, [isLoading, messages.length, sendMessage, saveBeforeAction])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Start the chat session when component mounts (only once)
  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true
      start()
    }
  }, [start])

  // Focus input when not loading
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus()
    }
  }, [isLoading])

  // File handling for image attachments
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return

    Array.from(files).forEach((file) => {
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        setAttachmentError(`Invalid file type: ${file.name}. Only JPEG and PNG are supported.`)
        return
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setAttachmentError(`File too large: ${file.name}. Maximum size is 5 MB.`)
        return
      }

      // Read and convert to base64
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        const base64Data = dataUrl.split(',')[1]

        const attachment: ImageAttachment = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          filename: file.name,
          mimeType: file.type as 'image/jpeg' | 'image/png',
          base64Data,
          previewUrl: dataUrl,
          size: file.size,
        }

        setPendingAttachments((prev) => [...prev, attachment])
        setAttachmentError(null)
      }
      reader.onerror = () => {
        setAttachmentError(`Failed to read file: ${file.name}`)
      }
      reader.readAsDataURL(file)
    })
  }, [])

  const handleRemoveAttachment = useCallback((id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      handleFileSelect(e.dataTransfer.files)
    },
    [handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          e.preventDefault()
          const file = items[i].getAsFile()
          if (file) {
            // Create a FileList-like object
            const dt = new DataTransfer()
            dt.items.add(file)
            handleFileSelect(dt.files)
          }
          break
        }
      }
    },
    [handleFileSelect]
  )

  const handleSend = () => {
    const content = inputValue.trim()
    // Allow sending if there's text OR attachments
    if ((!content && pendingAttachments.length === 0) || isLoading) return

    // Validate message length
    if (content.length > MAX_MESSAGE_LENGTH) {
      setAttachmentError(
        `Message is too long (${content.length.toLocaleString()} chars). Maximum is ${MAX_MESSAGE_LENGTH.toLocaleString()} characters. Try splitting into smaller messages.`
      )
      return
    }

    sendMessage(content, pendingAttachments.length > 0 ? pendingAttachments : undefined)
    setInputValue('')
    setPendingAttachments([]) // Clear attachments after sending
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Stuck warning banner */}
      <AnimatePresence>
        {isStuck && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[var(--color-warning)]/20 border-b-2 border-[var(--color-warning)] px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[var(--color-warning)]">
                <AlertTriangle size={16} />
                <span className="text-sm font-medium">Response taking too long</span>
              </div>
              <button
                onClick={handleForceStop}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[var(--color-warning)] text-black rounded-lg hover:bg-[var(--color-warning)]/80 transition-colors"
              >
                <Square size={12} />
                Force Stop
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection status and context controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[var(--color-border)] bg-[var(--color-bg-primary)]">
        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className="flex items-center gap-1.5">
            {connectionStatus === 'connected' ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-success)]"></span>
                </span>
                <span className="text-xs text-[var(--color-text-secondary)]">Live</span>
              </>
            ) : connectionStatus === 'connecting' ? (
              <>
                <Loader2 size={12} className="text-[var(--color-accent-primary)] animate-spin" />
                <span className="text-xs text-[var(--color-text-secondary)]">...</span>
              </>
            ) : (
              <>
                <WifiOff size={12} className="text-[var(--color-error)]" />
                <span className="text-xs text-[var(--color-text-secondary)]">Off</span>
              </>
            )}
          </div>

          {/* Context usage indicator */}
          {messages.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-tertiary)]">Context:</span>
                <div className="w-16 h-1.5 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      contextUsage().level === 'danger' ? 'bg-[var(--color-error)]' :
                      contextUsage().level === 'warning' ? 'bg-[var(--color-warning)]' :
                      'bg-[var(--color-success)]'
                    }`}
                    style={{ width: `${contextUsage().percentage}%` }}
                  />
                </div>
                <span className={`text-xs font-mono font-bold ${
                  contextUsage().level === 'danger' ? 'text-[var(--color-error)]' :
                  contextUsage().level === 'warning' ? 'text-[var(--color-warning)]' :
                  'text-[var(--color-text-secondary)]'
                }`}>
                  {contextUsage().percentage.toFixed(0)}%
                </span>
              </div>
              <span className="text-xs text-[var(--color-text-tertiary)]">
                {messages.length} msgs
              </span>
            </div>
          )}
        </div>

        {/* Context management buttons - always visible */}
        <div className="flex items-center gap-1">
          {/* History button */}
          <div className="relative">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium border-2 rounded-lg transition-all ${
                showHistory
                  ? 'bg-[var(--color-accent-primary)]/20 border-[var(--color-accent-primary)] text-[var(--color-accent-primary)]'
                  : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-accent-primary)]'
              }`}
              title="View saved conversations"
            >
              <History size={14} />
              {savedConversations.length > 0 && (
                <span className="text-[10px] bg-[var(--color-accent-primary)] text-white px-1 rounded">
                  {savedConversations.length}
                </span>
              )}
            </button>

            {/* History dropdown */}
            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 top-full mt-2 w-72 bg-[var(--color-bg-primary)] border-2 border-[var(--color-border)] rounded-lg shadow-xl z-50 overflow-hidden"
                >
                  <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                    <span className="text-xs font-bold text-[var(--color-text-primary)]">Saved Conversations</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {savedConversations.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[var(--color-text-tertiary)]">
                        No saved conversations yet
                      </div>
                    ) : (
                      savedConversations.map((convo) => (
                        <button
                          key={convo.id}
                          onClick={() => loadConversation(convo)}
                          className="w-full p-3 text-left hover:bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] last:border-b-0 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-[var(--color-text-primary)]">
                              {convo.id.startsWith('current-') ? '📝 Current' : '💾 Saved'}
                            </span>
                            <span className="text-[10px] text-[var(--color-text-tertiary)]">
                              {new Date(convo.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-xs text-[var(--color-text-secondary)] truncate">
                            {convo.preview || 'No preview'}
                          </div>
                          <div className="text-[10px] text-[var(--color-text-tertiary)] mt-1">
                            {convo.messageCount} messages
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={messages.length === 0}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium bg-[var(--color-bg-secondary)] border-2 border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-accent-primary)]/10 hover:border-[var(--color-accent-primary)] rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Export conversation to file"
          >
            <Download size={14} />
          </button>

          {/* Compact button */}
          <button
            onClick={handleCompact}
            disabled={isLoading || messages.length <= 10}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium bg-[var(--color-bg-secondary)] border-2 border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-accent-primary)]/10 hover:border-[var(--color-accent-primary)] rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Compact: Summarize older messages (auto-saves first)"
          >
            <Scissors size={14} />
          </button>

          {/* Reset button */}
          <button
            onClick={handleReset}
            disabled={isLoading}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium bg-[var(--color-bg-secondary)] border-2 border-[var(--color-danger)]/50 text-[var(--color-text-primary)] hover:bg-[var(--color-danger)]/10 hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Reset: Clear all (auto-saves first)"
          >
            <RotateCcw size={14} />
          </button>

          {/* Stop button - only show when loading */}
          {isLoading && (
            <button
              onClick={handleForceStop}
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold bg-[var(--color-error)] text-white border-2 border-[var(--color-error)] rounded-lg hover:bg-[var(--color-error)]/80 transition-all animate-pulse"
              title="Force stop request"
            >
              <Square size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto bg-[var(--color-bg-primary)] scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-tertiary)] text-sm px-6 text-center">
            {isLoading ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2"
              >
                <Loader2 size={16} className="animate-spin text-[var(--color-accent-primary)]" />
                <span>Connecting to assistant...</span>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <p className="text-base">Ask me anything about the codebase</p>
                <p className="text-xs opacity-60">I can help you understand code, find files, and debug issues</p>
              </motion.div>
            )}
          </div>
        ) : (
          <div className="py-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChatMessage message={message} />
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Loading indicator */}
      <AnimatePresence>
        {isLoading && messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg-tertiary)]"
          >
            <div className="flex items-center gap-3 text-[var(--color-text-secondary)] text-sm">
              <div className="flex gap-1">
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                  className="w-2 h-2 bg-[var(--color-accent-primary)] rounded-full"
                />
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                  className="w-2 h-2 bg-[var(--color-accent-primary)] rounded-full"
                />
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                  className="w-2 h-2 bg-[var(--color-accent-primary)] rounded-full"
                />
              </div>
              <span>Thinking...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div
        className="border-t border-[var(--color-border)] p-4 bg-[var(--color-bg-secondary)]"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {/* Attachment error banner */}
        {attachmentError && (
          <div className="flex items-center gap-2 p-2 mb-3 bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 rounded-lg text-sm text-[var(--color-error)]">
            <span className="flex-1">{attachmentError}</span>
            <button
              onClick={() => setAttachmentError(null)}
              className="p-0.5 hover:bg-[var(--color-error)]/20 rounded"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Attachment previews */}
        {pendingAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {pendingAttachments.map((attachment) => (
              <div
                key={attachment.id}
                className="relative group border-2 border-[var(--color-border)] p-1 bg-[var(--color-bg-tertiary)] rounded-lg"
              >
                <img
                  src={attachment.previewUrl}
                  alt={attachment.filename}
                  className="w-16 h-16 object-cover rounded"
                />
                <button
                  onClick={() => handleRemoveAttachment(attachment.id)}
                  className="absolute -top-2 -right-2 bg-[var(--color-error)] text-white rounded-full p-0.5 border-2 border-[var(--color-border)] hover:scale-110 transition-transform"
                  title="Remove attachment"
                >
                  <X size={12} />
                </button>
                <span className="text-xs truncate block max-w-16 mt-1 text-center text-[var(--color-text-secondary)]">
                  {attachment.filename.length > 10
                    ? `${attachment.filename.substring(0, 7)}...`
                    : attachment.filename}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />

          {/* Attach button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={connectionStatus !== 'connected'}
            className="
              btn btn-ghost
              p-3
              rounded-xl
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            title="Attach image (JPEG, PNG - max 5MB)"
          >
            <Paperclip size={18} />
          </motion.button>

          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              pendingAttachments.length > 0
                ? 'Add a message with your image(s)...'
                : 'Ask about the codebase...'
            }
            disabled={isLoading || connectionStatus !== 'connected'}
            className="
              flex-1
              bg-[var(--color-bg-primary)]
              border border-[var(--color-border)]
              rounded-xl
              px-4 py-3
              text-sm
              text-[var(--color-text-primary)]
              placeholder-[var(--color-text-tertiary)]
              resize-none
              min-h-[44px]
              max-h-[120px]
              focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/50 focus:border-[var(--color-accent-primary)]
              disabled:opacity-50
              transition-all
            "
            rows={1}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={
              (!inputValue.trim() && pendingAttachments.length === 0) ||
              isLoading ||
              connectionStatus !== 'connected'
            }
            className="
              btn btn-primary
              px-4
              rounded-xl
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            title="Send message"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </motion.button>
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-xs text-[var(--color-text-tertiary)]">
            Press Enter to send, Shift+Enter for new line. Drag & drop or paste images.
          </p>
          {inputValue.length > WARN_MESSAGE_LENGTH && (
            <span
              className={`text-xs font-mono ${
                inputValue.length > MAX_MESSAGE_LENGTH
                  ? 'text-[var(--color-error)]'
                  : 'text-[var(--color-warning)]'
              }`}
            >
              {inputValue.length.toLocaleString()}/{MAX_MESSAGE_LENGTH.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
