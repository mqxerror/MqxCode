/**
 * Assistant Chat Component
 *
 * Main chat interface for the project assistant.
 * Displays messages and handles user input.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, WifiOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAssistantChat } from '../hooks/useAssistantChat'
import { ChatMessage } from './ChatMessage'

interface AssistantChatProps {
  projectName: string
}

export function AssistantChat({ projectName }: AssistantChatProps) {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
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
  } = useAssistantChat({
    projectName,
    onError: handleError,
  })

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

  const handleSend = () => {
    const content = inputValue.trim()
    if (!content || isLoading) return

    sendMessage(content)
    setInputValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Connection status indicator */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
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
      <div className="border-t border-[var(--color-border)] p-4 bg-[var(--color-bg-secondary)]">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the codebase..."
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
            disabled={!inputValue.trim() || isLoading || connectionStatus !== 'connected'}
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
        <p className="text-xs text-[var(--color-text-tertiary)] mt-2 px-1">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
