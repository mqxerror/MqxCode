/**
 * Floating Action Button for toggling the Assistant panel
 */

import { MessageCircle, X } from 'lucide-react'
import { cn } from './aceternity/cn'

interface AssistantFABProps {
  onClick: () => void
  isOpen: boolean
}

export function AssistantFAB({
  onClick,
  isOpen,
}: AssistantFABProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={onClick}
        className={cn(
          "w-14 h-14",
          "flex items-center justify-center",
          "rounded-full",
          "transition-all duration-200",
          isOpen
            ? "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)] shadow-lg"
            : "bg-gradient-to-br from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-white shadow-[0_0_25px_rgba(99,102,241,0.4)] hover:shadow-[0_0_35px_rgba(99,102,241,0.5)]"
        )}
        title={isOpen ? 'Close Assistant (Press A)' : 'Open Assistant (Press A)'}
        aria-label={isOpen ? 'Close Assistant' : 'Open Assistant'}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  )
}
