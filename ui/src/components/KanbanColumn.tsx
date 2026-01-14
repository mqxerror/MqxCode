import { FeatureCard } from './FeatureCard'
import { Plus, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Feature } from '../lib/types'
import { cn } from './aceternity/cn'

interface KanbanColumnProps {
  title: string
  count: number
  features: Feature[]
  color: 'pending' | 'progress' | 'done'
  onFeatureClick: (feature: Feature) => void
  onAddFeature?: () => void
  onExpandProject?: () => void
  showExpandButton?: boolean
}

const colorConfig = {
  pending: {
    accent: 'var(--color-warning)',
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.3)',
    glow: 'rgba(245, 158, 11, 0.2)',
  },
  progress: {
    accent: 'var(--color-accent-primary)',
    bg: 'rgba(99, 102, 241, 0.1)',
    border: 'rgba(99, 102, 241, 0.3)',
    glow: 'rgba(99, 102, 241, 0.2)',
  },
  done: {
    accent: 'var(--color-success)',
    bg: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.3)',
    glow: 'rgba(16, 185, 129, 0.2)',
  },
}

export function KanbanColumn({
  title,
  count,
  features,
  color,
  onFeatureClick,
  onAddFeature,
  onExpandProject,
  showExpandButton,
}: KanbanColumnProps) {
  const config = colorConfig[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-2xl overflow-hidden",
        "bg-[var(--color-bg-secondary)] border border-[var(--color-border)]",
      )}
    >
      {/* Header */}
      <div
        className="px-4 py-4 border-b border-[var(--color-border)]"
        style={{
          background: `linear-gradient(135deg, ${config.bg} 0%, transparent 100%)`,
          borderTop: `3px solid ${config.accent}`
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2
              className="font-display text-base font-semibold"
              style={{ color: config.accent }}
            >
              {title}
            </h2>
            <span
              className="px-2 py-0.5 text-xs font-medium rounded-full"
              style={{
                backgroundColor: config.bg,
                color: config.accent,
                border: `1px solid ${config.border}`
              }}
            >
              {count}
            </span>
          </div>
          {(onAddFeature || onExpandProject) && (
            <div className="flex items-center gap-2">
              {onAddFeature && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onAddFeature}
                  className="btn btn-primary text-xs py-1.5 px-2.5"
                  title="Add new feature (N)"
                >
                  <Plus size={14} />
                </motion.button>
              )}
              {onExpandProject && showExpandButton && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onExpandProject}
                  className="btn btn-secondary text-xs py-1.5 px-2.5"
                  title="Expand project with AI (E)"
                >
                  <Sparkles size={14} />
                </motion.button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="p-3 space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin bg-[var(--color-bg-primary)]/50">
        <AnimatePresence mode="popLayout">
          {features.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-[var(--color-text-tertiary)]"
            >
              <p className="text-sm">No features</p>
            </motion.div>
          ) : (
            features.map((feature, index) => (
              <motion.div
                key={feature.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{
                  duration: 0.2,
                  delay: index * 0.03,
                  layout: { type: "spring", bounce: 0.2 }
                }}
              >
                <FeatureCard
                  feature={feature}
                  onClick={() => onFeatureClick(feature)}
                  isInProgress={color === 'progress'}
                />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
