/**
 * Assistant Panel Component
 *
 * Slide-in panel container for the project assistant chat.
 * Slides in from the right side of the screen.
 */

import { X, Bot, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AssistantChat } from './AssistantChat'

interface AssistantPanelProps {
  projectName: string
  isOpen: boolean
  onClose: () => void
}

export function AssistantPanel({ projectName, isOpen, onClose }: AssistantPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - click to close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="
              fixed right-0 top-0 bottom-0 z-50
              w-[420px] max-w-[90vw]
              bg-[var(--color-bg-primary)]
              border-l border-[var(--color-border)]
              shadow-2xl
              flex flex-col
            "
            role="dialog"
            aria-label="Project Assistant"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--color-border)] bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)]">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2">
                    <Bot size={20} className="text-white" />
                  </div>
                  <Sparkles
                    size={10}
                    className="absolute -top-1 -right-1 text-[var(--color-warning)]"
                  />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-white">Project Assistant</h2>
                  <p className="text-xs text-white/70 font-mono">{projectName}</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="
                  p-2
                  bg-white/10 hover:bg-white/20
                  rounded-lg
                  text-white
                  transition-colors
                "
                title="Close Assistant (Press A)"
                aria-label="Close Assistant"
              >
                <X size={18} />
              </motion.button>
            </div>

            {/* Chat area */}
            <div className="flex-1 overflow-hidden bg-[var(--color-bg-secondary)]">
              <AssistantChat projectName={projectName} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
