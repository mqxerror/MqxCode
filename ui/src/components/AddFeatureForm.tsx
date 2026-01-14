import { useState, useId } from 'react'
import { X, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCreateFeature } from '../hooks/useProjects'

interface Step {
  id: string
  value: string
}

interface AddFeatureFormProps {
  projectName: string
  onClose: () => void
}

export function AddFeatureForm({ projectName, onClose }: AddFeatureFormProps) {
  const formId = useId()
  const [category, setCategory] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('')
  const [steps, setSteps] = useState<Step[]>([{ id: `${formId}-step-0`, value: '' }])
  const [error, setError] = useState<string | null>(null)
  const [stepCounter, setStepCounter] = useState(1)

  const createFeature = useCreateFeature(projectName)

  const handleAddStep = () => {
    setSteps([...steps, { id: `${formId}-step-${stepCounter}`, value: '' }])
    setStepCounter(stepCounter + 1)
  }

  const handleRemoveStep = (id: string) => {
    setSteps(steps.filter(step => step.id !== id))
  }

  const handleStepChange = (id: string, value: string) => {
    setSteps(steps.map(step =>
      step.id === id ? { ...step, value } : step
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Filter out empty steps
    const filteredSteps = steps
      .map(s => s.value.trim())
      .filter(s => s.length > 0)

    try {
      await createFeature.mutateAsync({
        category: category.trim(),
        name: name.trim(),
        description: description.trim(),
        steps: filteredSteps,
        priority: priority ? parseInt(priority, 10) : undefined,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create feature')
    }
  }

  const isValid = category.trim() && name.trim() && description.trim()

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
        className="w-full max-w-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)] bg-gradient-to-r from-[var(--color-bg-secondary)] to-[var(--color-bg-tertiary)]">
          <h2 className="font-display text-xl font-semibold text-[var(--color-text-primary)]">
            Add Feature
          </h2>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors"
          >
            <X size={20} />
          </motion.button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto scrollbar-thin">
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
                <button type="button" onClick={() => setError(null)} className="hover:opacity-70">
                  <X size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Category & Priority Row */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block font-display font-semibold mb-2 text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Authentication, UI, API"
                className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/50 focus:border-[var(--color-accent-primary)] transition-all"
                required
              />
            </div>
            <div className="w-32">
              <label className="block font-display font-semibold mb-2 text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">
                Priority
              </label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                placeholder="Auto"
                min="1"
                className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/50 focus:border-[var(--color-accent-primary)] transition-all"
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block font-display font-semibold mb-2 text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Feature Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., User login form"
              className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/50 focus:border-[var(--color-accent-primary)] transition-all"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-display font-semibold mb-2 text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this feature should do..."
              className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/50 focus:border-[var(--color-accent-primary)] transition-all"
              required
            />
          </div>

          {/* Steps */}
          <div>
            <label className="block font-display font-semibold mb-2 text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Test Steps (Optional)
            </label>
            <div className="space-y-2">
              <AnimatePresence>
                {steps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex gap-2"
                  >
                    <span className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)] text-sm font-medium">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={step.value}
                      onChange={(e) => handleStepChange(step.id, e.target.value)}
                      placeholder="Describe this step..."
                      className="flex-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/50 focus:border-[var(--color-accent-primary)] transition-all"
                    />
                    {steps.length > 1 && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => handleRemoveStep(step.id)}
                        className="p-2.5 rounded-lg hover:bg-[var(--color-error)]/10 text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] transition-colors"
                      >
                        <Trash2 size={18} />
                      </motion.button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleAddStep}
              className="mt-3 flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/10 rounded-lg transition-colors"
            >
              <Plus size={16} />
              Add Step
            </motion.button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[var(--color-border)]">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={!isValid || createFeature.isPending}
              className="btn btn-success flex-1"
            >
              {createFeature.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Plus size={18} />
                  Create Feature
                </>
              )}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
