import { KanbanColumn } from './KanbanColumn'
import { motion } from 'framer-motion'
import type { Feature, FeatureListResponse } from '../lib/types'

interface KanbanBoardProps {
  features: FeatureListResponse | undefined
  onFeatureClick: (feature: Feature) => void
  onAddFeature?: () => void
  onExpandProject?: () => void
}

export function KanbanBoard({ features, onFeatureClick, onAddFeature, onExpandProject }: KanbanBoardProps) {
  const hasFeatures = features && (features.pending.length + features.in_progress.length + features.done.length) > 0

  if (!features) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['Pending', 'In Progress', 'Done'].map((title, index) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="rounded-2xl overflow-hidden bg-[var(--color-bg-secondary)] border border-[var(--color-border)]"
          >
            <div className="px-4 py-4 border-b border-[var(--color-border)]">
              <div className="h-6 w-24 bg-[var(--color-bg-tertiary)] rounded animate-pulse" />
            </div>
            <div className="p-3 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-28 bg-[var(--color-bg-tertiary)] rounded-xl animate-pulse" />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <KanbanColumn
        title="Pending"
        count={features.pending.length}
        features={features.pending}
        color="pending"
        onFeatureClick={onFeatureClick}
        onAddFeature={onAddFeature}
        onExpandProject={onExpandProject}
        showExpandButton={hasFeatures}
      />
      <KanbanColumn
        title="In Progress"
        count={features.in_progress.length}
        features={features.in_progress}
        color="progress"
        onFeatureClick={onFeatureClick}
      />
      <KanbanColumn
        title="Done"
        count={features.done.length}
        features={features.done}
        color="done"
        onFeatureClick={onFeatureClick}
      />
    </div>
  )
}
