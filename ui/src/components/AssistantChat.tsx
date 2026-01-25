/**
 * Assistant Chat Component
 *
 * Main chat interface for the project assistant.
 * Displays messages and handles user input.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, WifiOff, Paperclip, X, RotateCcw, Scissors } from 'lucide-react'
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

interface AssistantChatProps {
  projectName: string
}

export function AssistantChat({ projectName }: AssistantChatProps) {
  const [inputValue, setInputValue] = useState('')
  const [pendingAttachments, setPendingAttachments] = useState<ImageAttachment[]>([])
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasStartedRef = useRef(false)

  // Memoize the error handler to prevent infinite re-renders
  const handleError = useCallback((error: string) => {
    console.error('Assistant error:', error)
  }, [])

  const {
    messages,
    isLoading,
    connectionStatus,
    start,
    sendMessage,
    clearMessages,
  } = useAssistantChat({
    projectName,
    onError: handleError,
  })

  // Reset context - clear messages and start fresh
  const handleReset = useCallback(() => {
    if (isLoading) return
    clearMessages()
    hasStartedRef.current = false
    // Restart with new session
    setTimeout(() => {
      hasStartedRef.current = true
      start()
    }, 100)
  }, [isLoading, clearMessages, start])

  // Compact context - keep only recent messages (last 10)
  const handleCompact = useCallback(() => {
    if (isLoading || messages.length <= 10) return
    // Send a compact request that summarizes older messages
    sendMessage("[System: Please provide a brief summary of our conversation so far, then we can continue from there.]")
  }, [isLoading, messages.length, sendMessage])

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
      {/* Connection status and context controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[var(--color-border)] bg-[var(--color-bg-primary)]">
        <div className="flex items-center gap-2">
          {connectionStatus === 'connected' ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-success)]"></span>
              </span>
              <span className="text-xs text-[var(--color-text-secondary)]">Connected</span>
            </>
          ) : connectionStatus === 'connecting' ? (
            <>
              <Loader2 size={12} className="text-[var(--color-accent-primary)] animate-spin" />
              <span className="text-xs text-[var(--color-text-secondary)]">Connecting...</span>
            </>
          ) : (
            <>
              <WifiOff size={12} className="text-[var(--color-error)]" />
              <span className="text-xs text-[var(--color-text-secondary)]">Disconnected</span>
            </>
          )}
        </div>

        {/* Context management buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCompact}
            disabled={isLoading || messages.length <= 10}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-accent-primary)]/10 hover:border-[var(--color-accent-primary)] rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Compact context - summarize older messages"
          >
            <Scissors size={14} />
            <span>Compact</span>
          </button>
          <button
            onClick={handleReset}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-danger)]/10 hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Reset context - start fresh conversation"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
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
