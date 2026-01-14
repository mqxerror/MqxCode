import { useEffect, useRef } from 'react'
import { X, Loader2, AlertCircle, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettings, useUpdateSettings, useAvailableModels } from '../hooks/useProjects'

interface SettingsModalProps {
  onClose: () => void
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { data: settings, isLoading, isError, refetch } = useSettings()
  const { data: modelsData } = useAvailableModels()
  const updateSettings = useUpdateSettings()
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Focus trap - keep focus within modal
  useEffect(() => {
    const modal = modalRef.current
    if (!modal) return

    // Focus the close button when modal opens
    closeButtonRef.current?.focus()

    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleTabKey)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('keydown', handleTabKey)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const handleYoloToggle = () => {
    if (settings && !updateSettings.isPending) {
      updateSettings.mutate({ yolo_mode: !settings.yolo_mode })
    }
  }

  const handleModelChange = (modelId: string) => {
    if (!updateSettings.isPending) {
      updateSettings.mutate({ model: modelId })
    }
  }

  const models = modelsData?.models ?? []
  const isSaving = updateSettings.isPending

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-md bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="settings-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)] bg-gradient-to-r from-[var(--color-bg-secondary)] to-[var(--color-bg-tertiary)]">
          <div className="flex items-center gap-2">
            <h2 id="settings-title" className="font-display text-xl font-semibold text-[var(--color-text-primary)]">
              Settings
            </h2>
            {isSaving && (
              <Loader2 className="animate-spin text-[var(--color-accent-primary)]" size={16} />
            )}
          </div>
          <motion.button
            ref={closeButtonRef}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors"
            aria-label="Close settings"
          >
            <X size={20} />
          </motion.button>
        </div>

        <div className="p-6">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-[var(--color-accent-primary)]" size={24} />
              <span className="ml-2 text-[var(--color-text-secondary)]">Loading settings...</span>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 rounded-xl mb-4"
            >
              <div className="flex items-center gap-2 text-[var(--color-error)]">
                <AlertCircle size={18} />
                <span>Failed to load settings</span>
              </div>
              <button
                onClick={() => refetch()}
                className="mt-2 text-sm text-[var(--color-accent-primary)] hover:underline"
              >
                Retry
              </button>
            </motion.div>
          )}

          {/* Settings Content */}
          {settings && !isLoading && (
            <div className="space-y-6">
              {/* YOLO Mode Toggle */}
              <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${settings.yolo_mode ? 'bg-gradient-to-br from-orange-500 to-red-500' : 'bg-[var(--color-bg-tertiary)]'}`}>
                      <Zap size={20} className={settings.yolo_mode ? 'text-white' : 'text-[var(--color-text-tertiary)]'} />
                    </div>
                    <div>
                      <label
                        id="yolo-label"
                        className="font-display font-semibold text-[var(--color-text-primary)]"
                      >
                        YOLO Mode
                      </label>
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                        Skip testing for rapid prototyping
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleYoloToggle}
                    disabled={isSaving}
                    className={`relative w-14 h-8 rounded-full transition-colors ${
                      settings.yolo_mode
                        ? 'bg-gradient-to-r from-orange-500 to-red-500'
                        : 'bg-[var(--color-bg-tertiary)]'
                    } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    role="switch"
                    aria-checked={settings.yolo_mode}
                    aria-labelledby="yolo-label"
                  >
                    <motion.span
                      animate={{ x: settings.yolo_mode ? 24 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
                    />
                  </motion.button>
                </div>
              </div>

              {/* Model Selection - Radio Group */}
              <div>
                <label
                  id="model-label"
                  className="font-display font-semibold text-sm text-[var(--color-text-primary)] block mb-3"
                >
                  Model
                </label>
                <div
                  className="flex rounded-xl overflow-hidden border border-[var(--color-border)]"
                  role="radiogroup"
                  aria-labelledby="model-label"
                >
                  {models.map((model, index) => (
                    <motion.button
                      key={model.id}
                      whileHover={{ backgroundColor: settings.model === model.id ? undefined : 'var(--color-bg-tertiary)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleModelChange(model.id)}
                      disabled={isSaving}
                      role="radio"
                      aria-checked={settings.model === model.id}
                      className={`flex-1 py-3 px-4 font-medium text-sm transition-colors ${
                        settings.model === model.id
                          ? 'bg-[var(--color-accent-primary)] text-white'
                          : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                      } ${index !== models.length - 1 ? 'border-r border-[var(--color-border)]' : ''} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {model.name}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Update Error */}
              <AnimatePresence>
                {updateSettings.isError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 rounded-xl text-[var(--color-error)] text-sm"
                  >
                    Failed to save settings. Please try again.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
