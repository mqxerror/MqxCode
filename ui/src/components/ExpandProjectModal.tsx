/**
 * Expand Project Modal
 *
 * Full-screen modal wrapper for the ExpandProjectChat component.
 * Allows users to add multiple features to an existing project via AI.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { ExpandProjectChat } from './ExpandProjectChat'

interface ExpandProjectModalProps {
  isOpen: boolean
  projectName: string
  onClose: () => void
  onFeaturesAdded: () => void  // Called to refresh feature list
}

export function ExpandProjectModal({
  isOpen,
  projectName,
  onClose,
  onFeaturesAdded,
}: ExpandProjectModalProps) {
  const handleComplete = (featuresAdded: number) => {
    if (featuresAdded > 0) {
      onFeaturesAdded()
    }
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-[var(--color-bg-primary)]"
        >
          <ExpandProjectChat
            projectName={projectName}
            onComplete={handleComplete}
            onCancel={onClose}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
