/**
 * ConfirmDialog Component
 *
 * A reusable confirmation dialog with modern glassmorphism design.
 * Used to confirm destructive actions like deleting projects.
 */

import { AlertTriangle, X, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const variantColors = {
    danger: {
      iconBg: 'bg-[var(--color-error)]/20',
      iconColor: 'text-[var(--color-error)]',
      button: 'btn btn-danger',
    },
    warning: {
      iconBg: 'bg-[var(--color-warning)]/20',
      iconColor: 'text-[var(--color-warning)]',
      button: 'btn btn-warning',
    },
  }

  const colors = variantColors[variant]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${colors.iconBg}`}>
                  <AlertTriangle size={20} className={colors.iconColor} />
                </div>
                <h2 className="font-display font-semibold text-lg text-[var(--color-text-primary)]">
                  {title}
                </h2>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onCancel}
                className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors"
                disabled={isLoading}
              >
                <X size={20} />
              </motion.button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed mb-6">
                {message}
              </p>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onCancel}
                  className="btn btn-secondary"
                  disabled={isLoading}
                >
                  {cancelLabel}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onConfirm}
                  className={colors.button}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    confirmLabel
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
