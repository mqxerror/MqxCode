/**
 * Chat Message Component
 *
 * Displays a single message in the spec creation chat.
 * Supports user, assistant, and system messages with modern styling.
 */

import { Bot, User, Info } from 'lucide-react'
import type { ChatMessage as ChatMessageType } from '../lib/types'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { role, content, attachments, timestamp, isStreaming } = message

  // Format timestamp
  const timeString = timestamp.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  // Role-specific styling
  const roleConfig = {
    user: {
      icon: User,
      bgColor: 'bg-gradient-to-br from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)]',
      textColor: 'text-white',
      align: 'justify-end',
      bubbleAlign: 'items-end',
      iconBg: 'bg-[var(--color-accent-primary)]',
    },
    assistant: {
      icon: Bot,
      bgColor: 'bg-[var(--color-bg-secondary)]',
      textColor: 'text-[var(--color-text-primary)]',
      align: 'justify-start',
      bubbleAlign: 'items-start',
      iconBg: 'bg-gradient-to-br from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)]',
    },
    system: {
      icon: Info,
      bgColor: 'bg-[var(--color-success)]/20',
      textColor: 'text-[var(--color-success)]',
      align: 'justify-center',
      bubbleAlign: 'items-center',
      iconBg: 'bg-[var(--color-success)]',
    },
  }

  const config = roleConfig[role]
  const Icon = config.icon

  // System messages are styled differently
  if (role === 'system') {
    return (
      <div className={`flex ${config.align} px-4 py-2`}>
        <div
          className={`
            ${config.bgColor}
            ${config.textColor}
            border border-[var(--color-success)]/30
            px-4 py-2
            text-sm font-mono
            rounded-xl
          `}
        >
          <span className="flex items-center gap-2">
            <Icon size={14} />
            {content}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${config.align} px-4 py-2`}>
      <div className={`flex flex-col ${config.bubbleAlign} max-w-[80%] gap-1`}>
        {/* Message bubble */}
        <div className="flex items-start gap-2">
          {role === 'assistant' && (
            <div
              className={`
                ${config.iconBg}
                p-1.5
                rounded-lg
                flex-shrink-0
              `}
            >
              <Icon size={16} className="text-white" />
            </div>
          )}

          <div
            className={`
              ${config.bgColor}
              ${config.textColor}
              border border-[var(--color-border)]
              px-4 py-3
              rounded-2xl
              ${role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}
              ${isStreaming ? 'animate-pulse' : ''}
            `}
          >
            {/* Parse content for basic markdown-like formatting */}
            {content && (
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {content.split('\n').map((line, i) => {
                  // Bold text
                  const boldRegex = /\*\*(.*?)\*\*/g
                  const parts = []
                  let lastIndex = 0
                  let match

                  while ((match = boldRegex.exec(line)) !== null) {
                    if (match.index > lastIndex) {
                      parts.push(line.slice(lastIndex, match.index))
                    }
                    parts.push(
                      <strong key={`bold-${i}-${match.index}`} className="font-semibold">
                        {match[1]}
                      </strong>
                    )
                    lastIndex = match.index + match[0].length
                  }

                  if (lastIndex < line.length) {
                    parts.push(line.slice(lastIndex))
                  }

                  return (
                    <span key={i}>
                      {parts.length > 0 ? parts : line}
                      {i < content.split('\n').length - 1 && '\n'}
                    </span>
                  )
                })}
              </div>
            )}

            {/* Display image attachments */}
            {attachments && attachments.length > 0 && (
              <div className={`flex flex-wrap gap-2 ${content ? 'mt-3' : ''}`}>
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="border border-[var(--color-border)] rounded-lg p-1 bg-[var(--color-bg-primary)]"
                  >
                    <img
                      src={attachment.previewUrl}
                      alt={attachment.filename}
                      className="max-w-48 max-h-48 object-contain cursor-pointer hover:opacity-90 transition-opacity rounded"
                      onClick={() => window.open(attachment.previewUrl, '_blank')}
                      title={`${attachment.filename} (click to enlarge)`}
                    />
                    <span className="text-xs text-[var(--color-text-tertiary)] block mt-1 text-center">
                      {attachment.filename}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Streaming indicator */}
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-[var(--color-accent-primary)] ml-1 animate-pulse rounded" />
            )}
          </div>

          {role === 'user' && (
            <div
              className={`
                ${config.iconBg}
                p-1.5
                rounded-lg
                flex-shrink-0
              `}
            >
              <Icon size={16} className="text-white" />
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-xs text-[var(--color-text-tertiary)] font-mono px-2">
          {timeString}
        </span>
      </div>
    </div>
  )
}
