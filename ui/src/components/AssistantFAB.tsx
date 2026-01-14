/**
 * Floating Action Button for toggling the Assistant panel
 */

import { MessageCircle, X, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface AssistantFABProps {
  onClick: () => void
  isOpen: boolean
}

export function AssistantFAB({ onClick, isOpen }: AssistantFABProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className={`
        fixed bottom-6 right-6 z-50
        w-14 h-14
        flex items-center justify-center
        rounded-full
        transition-all duration-300
        shadow-lg
        ${isOpen
          ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)]'
          : 'bg-gradient-to-br from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-white'
        }
      `}
      title={isOpen ? 'Close Assistant (Press A)' : 'Open Assistant (Press A)'}
      aria-label={isOpen ? 'Close Assistant' : 'Open Assistant'}
    >
      {/* Glow effect when closed */}
      {!isOpen && (
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] blur-xl opacity-50"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="close"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <X size={24} />
          </motion.div>
        ) : (
          <motion.div
            key="open"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative"
          >
            <MessageCircle size={24} />
            <Sparkles
              size={12}
              className="absolute -top-1 -right-1 text-[var(--color-warning)]"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
