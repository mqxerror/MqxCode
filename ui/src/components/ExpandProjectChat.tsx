/**
 * Expand Project Chat Component
 *
 * Full chat interface for interactive project expansion with Claude.
 * Allows users to describe new features in natural language.
 * Includes conversation persistence, context monitoring, and history.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Send, X, CheckCircle2, AlertCircle, Wifi, WifiOff, RotateCcw, Paperclip, Plus, Download, Scissors, History, Square, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useExpandChat } from '../hooks/useExpandChat'
import { ChatMessage } from './ChatMessage'
import { TypingIndicator } from './TypingIndicator'
import type { ImageAttachment } from '../lib/types'

// Image upload validation constants
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png']

// Message length validation
const MAX_MESSAGE_LENGTH = 100000 // ~100K chars
const WARN_MESSAGE_LENGTH = 50000 // Warn above this

// Timeout for detecting stuck state (60 seconds)
const STUCK_TIMEOUT_MS = 60000

// Context window estimation (Claude has ~200K tokens, ~4 chars per token)
const ESTIMATED_CONTEXT_CHARS = 200000 * 4 // ~800K chars
const CONTEXT_WARNING_THRESHOLD = 0.7 // Warn at 70%
const CONTEXT_DANGER_THRESHOLD = 0.9 // Danger at 90%

// Local storage key for conversation history
const STORAGE_KEY_PREFIX = 'expand-conversations-'

interface ExpandProjectChatProps {
  projectName: string
  onComplete: (featuresAdded: number) => void
  onCancel: () => void
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

export function ExpandProjectChat({
  projectName,
  onComplete,
  onCancel,
}: ExpandProjectChatProps) {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendingAttachments, setPendingAttachments] = useState<ImageAttachment[]>([])
  const [isStuck, setIsStuck] = useState(false)
  const [savedConversations, setSavedConversations] = useState<SavedConversation[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const stuckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const storageKey = `${STORAGE_KEY_PREFIX}${projectName}`

  // Memoize error handler to keep hook dependencies stable
  const handleError = useCallback((err: string) => setError(err), [])

  const {
    messages,
    isLoading,
    isComplete,
    connectionStatus,
    featuresCreated,
    start,
    sendMessage,
    disconnect,
    clearMessages,
    restoreMessages,
  } = useExpandChat({
    projectName,
    onComplete,
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

  // Immediate save function
  const saveCurrentConversation = useCallback(() => {
    if (messages.length < 2) return

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
      const updated = [currentConvo, ...filtered].slice(0, 10)
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated))
      } catch (e) {
        console.error('Failed to save conversation:', e)
      }
      return updated
    })
  }, [messages, projectName, storageKey])

  // Load saved conversations on mount
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
        }
      }
    } catch (e) {
      console.error('Failed to load saved conversations:', e)
    }
  }, [storageKey, projectName, restoreMessages])

  // Auto-save when messages change
  useEffect(() => {
    if (messages.length < 2) return
    const timer = setTimeout(saveCurrentConversation, 1000)
    return () => clearTimeout(timer)
  }, [messages, saveCurrentConversation])

  // Save before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (messages.length >= 2) {
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

  // Save before action helper
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
    const restoredMessages = convo.messages.map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
      timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
      isStreaming: false,
    }))
    restoreMessages(restoredMessages)
  }, [restoreMessages])

  // Save conversation to file
  const handleSave = useCallback(() => {
    if (messages.length === 0) return
    const content = messages.map(msg => {
      const time = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''
      const role = msg.role.toUpperCase()
      return `[${time}] ${role}:\n${msg.content}\n`
    }).join('\n---\n\n')
    const blob = new Blob([`# Expand Project Conversation - ${projectName}\n# Exported: ${new Date().toLocaleString()}\n\n${content}`], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expand-chat-${projectName}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [messages, projectName])

  // Force stop
  const handleForceStop = useCallback(() => {
    disconnect()
    setIsStuck(false)
    setTimeout(() => start(), 500)
  }, [disconnect, start])

  // Reset context
  const handleReset = useCallback(() => {
    if (isLoading) return
    saveBeforeAction()
    clearMessages()
    setTimeout(() => start(), 100)
  }, [isLoading, clearMessages, start, saveBeforeAction])

  // Compact context
  const handleCompact = useCallback(() => {
    if (isLoading || messages.length <= 10) return
    saveBeforeAction()
    sendMessage("[System: Please provide a brief summary of our conversation so far, then we can continue from there.]")
  }, [isLoading, messages.length, sendMessage, saveBeforeAction])

  // Start the chat session when component mounts
  useEffect(() => {
    start()
    return () => disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input when not loading
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isLoading])

  const handleSendMessage = () => {
    const trimmed = input.trim()
    if ((!trimmed && pendingAttachments.length === 0) || isLoading) return
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      setError(`Message is too long (${trimmed.length.toLocaleString()} chars). Maximum is ${MAX_MESSAGE_LENGTH.toLocaleString()} characters.`)
      return
    }
    sendMessage(trimmed, pendingAttachments.length > 0 ? pendingAttachments : undefined)
    setInput('')
    setPendingAttachments([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // File handling
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`Invalid file type: ${file.name}. Only JPEG and PNG are supported.`)
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large: ${file.name}. Maximum size is 5 MB.`)
        return
      }
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
      }
      reader.onerror = () => setError(`Failed to read file: ${file.name}`)
      reader.readAsDataURL(file)
    })
  }, [])

  const handleRemoveAttachment = useCallback((id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault()
        const file = items[i].getAsFile()
        if (file) {
          const dt = new DataTransfer()
          dt.items.add(file)
          handleFileSelect(dt.files)
        }
        break
      }
    }
  }, [handleFileSelect])

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-primary)]">
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

      {/* Header with context controls */}
      <div className="flex items-center justify-between p-4 border-b-2 border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <div className="flex items-center gap-3">
          <h2 className="font-display font-bold text-lg text-[var(--color-text-primary)]">
            Expand Project: {projectName}
          </h2>

          {/* Connection status */}
          <span className={`flex items-center gap-1 text-xs ${
            connectionStatus === 'connected' ? 'text-[var(--color-success)]' :
            connectionStatus === 'connecting' ? 'text-[var(--color-warning)]' :
            connectionStatus === 'error' ? 'text-[var(--color-danger)]' :
            'text-[var(--color-text-secondary)]'
          }`}>
            {connectionStatus === 'connected' ? <Wifi size={12} /> : <WifiOff size={12} />}
            {connectionStatus === 'connected' ? 'Connected' : connectionStatus}
          </span>

          {featuresCreated > 0 && (
            <span className="flex items-center gap-1 text-sm text-[var(--color-success)] font-bold">
              <Plus size={14} />
              {featuresCreated} added
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Context usage */}
          {messages.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]">
              <span className="text-xs text-[var(--color-text-tertiary)]">Context:</span>
              <div className="w-12 h-1.5 bg-[var(--color-bg-primary)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    contextUsage().level === 'danger' ? 'bg-[var(--color-danger)]' :
                    contextUsage().level === 'warning' ? 'bg-[var(--color-warning)]' :
                    'bg-[var(--color-success)]'
                  }`}
                  style={{ width: `${contextUsage().percentage}%` }}
                />
              </div>
              <span className={`text-xs font-mono font-bold ${
                contextUsage().level === 'danger' ? 'text-[var(--color-danger)]' :
                contextUsage().level === 'warning' ? 'text-[var(--color-warning)]' :
                'text-[var(--color-text-secondary)]'
              }`}>
                {contextUsage().percentage.toFixed(0)}%
              </span>
            </div>
          )}

          {/* History button */}
          <div className="relative">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2 rounded-lg border-2 transition-all ${
                showHistory
                  ? 'bg-[var(--color-accent-primary)]/20 border-[var(--color-accent-primary)]'
                  : 'bg-[var(--color-bg-tertiary)] border-[var(--color-border)] hover:border-[var(--color-accent-primary)]'
              }`}
              title="View saved conversations"
            >
              <History size={16} />
              {savedConversations.length > 0 && (
                <span className="absolute -top-1 -right-1 text-[10px] bg-[var(--color-accent-primary)] text-white w-4 h-4 rounded-full flex items-center justify-center">
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
                    <span className="text-xs font-bold">Saved Conversations</span>
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
                          className="w-full p-3 text-left hover:bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] last:border-b-0"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">
                              {convo.id.startsWith('current-') ? 'Current' : 'Saved'}
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
            className="p-2 rounded-lg border-2 bg-[var(--color-bg-tertiary)] border-[var(--color-border)] hover:border-[var(--color-accent-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Export conversation"
          >
            <Download size={16} />
          </button>

          {/* Compact button */}
          <button
            onClick={handleCompact}
            disabled={isLoading || messages.length <= 10}
            className="p-2 rounded-lg border-2 bg-[var(--color-bg-tertiary)] border-[var(--color-border)] hover:border-[var(--color-accent-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Compact conversation"
          >
            <Scissors size={16} />
          </button>

          {/* Reset button */}
          <button
            onClick={handleReset}
            disabled={isLoading}
            className="p-2 rounded-lg border-2 bg-[var(--color-bg-tertiary)] border-[var(--color-danger)]/50 hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Reset conversation"
          >
            <RotateCcw size={16} />
          </button>

          {/* Stop button */}
          {isLoading && (
            <button
              onClick={handleForceStop}
              className="p-2 rounded-lg bg-[var(--color-danger)] text-white border-2 border-[var(--color-danger)] animate-pulse"
              title="Force stop"
            >
              <Square size={16} />
            </button>
          )}

          {isComplete && (
            <span className="flex items-center gap-1 text-sm text-[var(--color-success)] font-bold">
              <CheckCircle2 size={16} />
              Complete
            </span>
          )}

          <button
            onClick={onCancel}
            className="btn btn-ghost btn-icon p-2"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-[var(--color-danger)] text-white border-b-2 border-[var(--color-border)]">
          <AlertCircle size={16} />
          <span className="flex-1 text-sm">{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-white/20 rounded">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="card p-6 max-w-md">
              <h3 className="font-display font-bold text-lg mb-2">Starting Project Expansion</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Connecting to Claude to help you add new features to your project...
              </p>
              {connectionStatus === 'error' && (
                <button onClick={start} className="btn btn-primary mt-4 text-sm">
                  <RotateCcw size={14} />
                  Retry Connection
                </button>
              )}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      {!isComplete && (
        <div
          className="p-4 border-t-2 border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {/* Attachment previews */}
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {pendingAttachments.map((attachment) => (
                <div key={attachment.id} className="relative group border-2 border-[var(--color-border)] p-1 bg-[var(--color-bg-tertiary)] rounded-lg">
                  <img src={attachment.previewUrl} alt={attachment.filename} className="w-16 h-16 object-cover rounded" />
                  <button
                    onClick={() => handleRemoveAttachment(attachment.id)}
                    className="absolute -top-2 -right-2 bg-[var(--color-danger)] text-white rounded-full p-0.5 border-2 border-[var(--color-border)] hover:scale-110 transition-transform"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={connectionStatus !== 'connected'}
              className="btn btn-ghost btn-icon p-3"
              title="Attach image"
            >
              <Paperclip size={18} />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={pendingAttachments.length > 0 ? 'Add a message with your image(s)...' : 'Describe the features you want to add...'}
              className="input flex-1"
              disabled={isLoading || connectionStatus !== 'connected'}
            />
            <button
              onClick={handleSendMessage}
              disabled={(!input.trim() && pendingAttachments.length === 0) || isLoading || connectionStatus !== 'connected'}
              className="btn btn-primary px-6"
            >
              <Send size={18} />
            </button>
          </div>

          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-[var(--color-text-tertiary)]">
              Press Enter to send. Drag & drop or paste images.
            </p>
            {input.length > WARN_MESSAGE_LENGTH && (
              <span className={`text-xs font-mono ${input.length > MAX_MESSAGE_LENGTH ? 'text-[var(--color-danger)]' : 'text-[var(--color-warning)]'}`}>
                {input.length.toLocaleString()}/{MAX_MESSAGE_LENGTH.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Completion footer */}
      {isComplete && (
        <div className="p-4 border-t-2 border-[var(--color-border)] bg-[var(--color-success)]">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} />
              <span className="font-bold">Added {featuresCreated} new feature{featuresCreated !== 1 ? 's' : ''}!</span>
            </div>
            <button onClick={() => onComplete(featuresCreated)} className="btn bg-white/20 hover:bg-white/30 text-white">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
