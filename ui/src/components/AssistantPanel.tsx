/**
 * Assistant Panel Component
 *
 * Slide-in panel container for the project assistant chat.
 * Slides in from the right side of the screen.
 */

import { X, Bot } from 'lucide-react'
import { AssistantChat } from './AssistantChat'
import { cn } from './aceternity/cn'

interface AssistantPanelProps {
  projectName: string
  isOpen: boolean
  onClose: () => void
}

export function AssistantPanel({ projectName, isOpen, onClose }: AssistantPanelProps) {
  return (
    <>
      {/* Backdrop - click to close */}
      <div
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 bottom-0 z-50",
          "w-[420px] max-w-[90vw]",
          "bg-[var(--color-bg-primary)]",
          "border-l border-[var(--color-border)]",
          "shadow-2xl",
          "flex flex-col",
          "transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-label="Project Assistant"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--color-border)] bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)]">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-white">Project Assistant</h2>
              <p className="text-xs text-white/70 font-mono">{projectName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            title="Close Assistant (Press A)"
            aria-label="Close Assistant"
          >
            <X size={18} />
          </button>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-hidden bg-[var(--color-bg-secondary)]">
          <AssistantChat projectName={projectName} />
        </div>
      </div>
    </>
  )
}
