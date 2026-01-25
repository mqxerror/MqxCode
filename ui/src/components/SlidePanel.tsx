import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from './aceternity/cn'

interface SlidePanelProps {
  isOpen: boolean
  onClose: () => void
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  width?: 'md' | 'lg' | 'xl' | '2xl'
  position?: 'left' | 'right'
}

const widthClasses = {
  md: 'max-w-md w-full',
  lg: 'max-w-lg w-full',
  xl: 'max-w-xl w-full',
  '2xl': 'max-w-2xl w-full',
}

export function SlidePanel({
  isOpen,
  onClose,
  title,
  icon,
  children,
  width = 'xl',
  position = 'right',
}: SlidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Focus trap
  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus()
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ x: position === 'right' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: position === 'right' ? '100%' : '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'fixed top-0 bottom-0 z-50 flex flex-col',
              'bg-[var(--color-bg-primary)] border-[var(--color-border)]',
              'shadow-2xl',
              position === 'right' ? 'right-0 border-l-2' : 'left-0 border-r-2',
              widthClasses[width]
            )}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="slide-panel-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b-2 border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
              <div className="flex items-center gap-3">
                {icon && (
                  <div className="p-2 rounded-lg bg-[var(--color-accent-primary)]/15 border border-[var(--color-accent-primary)]/30">
                    {icon}
                  </div>
                )}
                <h2
                  id="slide-panel-title"
                  className="font-display text-lg font-semibold text-[var(--color-text-primary)]"
                >
                  {title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors"
                aria-label="Close panel"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default SlidePanel
