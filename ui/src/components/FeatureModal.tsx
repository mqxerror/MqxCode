import { useState } from 'react'
import { X, CheckCircle2, Circle, SkipForward, Trash2, Loader2, AlertCircle, Pencil } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSkipFeature, useDeleteFeature } from '../hooks/useProjects'
import { EditFeatureForm } from './EditFeatureForm'
import type { Feature } from '../lib/types'

interface FeatureModalProps {
  feature: Feature
  projectName: string
  onClose: () => void
}

export function FeatureModal({ feature, projectName, onClose }: FeatureModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const skipFeature = useSkipFeature(projectName)
  const deleteFeature = useDeleteFeature(projectName)

  const handleSkip = async () => {
    setError(null)
    try {
      await skipFeature.mutateAsync(feature.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to skip feature')
    }
  }

  const handleDelete = async () => {
    setError(null)
    try {
      await deleteFeature.mutateAsync(feature.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete feature')
    }
  }

  // Show edit form when in edit mode
  if (showEdit) {
    return (
      <EditFeatureForm
        feature={feature}
        projectName={projectName}
        onClose={() => setShowEdit(false)}
        onSaved={onClose}
      />
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[var(--color-border)] bg-gradient-to-r from-[var(--color-bg-secondary)] to-[var(--color-bg-tertiary)]">
          <div>
            <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)] mb-2">
              {feature.category}
            </span>
            <h2 className="font-display text-xl font-semibold text-[var(--color-text-primary)]">
              {feature.name}
            </h2>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors"
          >
            <X size={20} />
          </motion.button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 p-4 bg-[var(--color-error)]/10 text-[var(--color-error)] rounded-xl border border-[var(--color-error)]/30"
              >
                <AlertCircle size={20} />
                <span className="flex-1 text-sm">{error}</span>
                <button onClick={() => setError(null)} className="hover:opacity-70">
                  <X size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
            {feature.passes ? (
              <>
                <CheckCircle2 size={24} className="text-[var(--color-success)]" />
                <span className="font-display font-semibold text-[var(--color-success)]">
                  COMPLETE
                </span>
              </>
            ) : (
              <>
                <Circle size={24} className="text-[var(--color-text-tertiary)]" />
                <span className="font-display font-semibold text-[var(--color-text-secondary)]">
                  PENDING
                </span>
              </>
            )}
            <span className="ml-auto font-mono text-sm text-[var(--color-text-tertiary)]">
              Priority: #{feature.priority}
            </span>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-display font-semibold mb-2 text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Description
            </h3>
            <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
              {feature.description}
            </p>
          </div>

          {/* Steps */}
          {feature.steps.length > 0 && (
            <div>
              <h3 className="font-display font-semibold mb-3 text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">
                Test Steps
              </h3>
              <ol className="space-y-2">
                {feature.steps.map((step, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]"
                  >
                    <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)] text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="text-sm text-[var(--color-text-secondary)]">{step}</span>
                  </motion.li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Actions */}
        {!feature.passes && (
          <div className="p-6 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <AnimatePresence mode="wait">
              {showDeleteConfirm ? (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <p className="font-medium text-center text-[var(--color-text-primary)]">
                    Are you sure you want to delete this feature?
                  </p>
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleDelete}
                      disabled={deleteFeature.isPending}
                      className="btn btn-danger flex-1"
                    >
                      {deleteFeature.isPending ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        'Yes, Delete'
                      )}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleteFeature.isPending}
                      className="btn btn-secondary flex-1"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="actions"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex gap-3"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowEdit(true)}
                    disabled={skipFeature.isPending}
                    className="btn btn-primary flex-1"
                  >
                    <Pencil size={18} />
                    Edit
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSkip}
                    disabled={skipFeature.isPending}
                    className="btn btn-warning flex-1"
                  >
                    {skipFeature.isPending ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        <SkipForward size={18} />
                        Skip
                      </>
                    )}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={skipFeature.isPending}
                    className="btn btn-danger px-4"
                  >
                    <Trash2 size={18} />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
