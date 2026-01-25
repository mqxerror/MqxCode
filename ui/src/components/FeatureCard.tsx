import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import type { Feature } from '../lib/types'
import { cn } from './aceternity'

interface FeatureCardProps {
  feature: Feature
  onClick: () => void
  isInProgress?: boolean
}

// Generate consistent color for category
function getCategoryColor(category: string): { bg: string; text: string } {
  const colors = [
    { bg: 'rgba(236, 72, 153, 0.15)', text: '#ec4899' }, // pink
    { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' }, // blue
    { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' }, // green
    { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' }, // yellow
    { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' }, // red
    { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6' }, // purple
    { bg: 'rgba(6, 182, 212, 0.15)', text: '#06b6d4' }, // cyan
  ]

  let hash = 0
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

export function FeatureCard({ feature, onClick, isInProgress }: FeatureCardProps) {
  const categoryColor = getCategoryColor(feature.category)

  return (
    <button
      onClick={onClick}
      className="w-full text-left"
    >
      <div
        className={cn(
          "relative w-full p-4 rounded-xl cursor-pointer transition-all duration-200",
          "bg-[var(--color-bg-card)] border border-[var(--color-border)]",
          "hover:border-[var(--color-accent-primary)] hover:shadow-[0_0_15px_rgba(99,102,241,0.15)]",
          isInProgress && "border-[var(--color-accent-primary)] shadow-[0_0_20px_rgba(99,102,241,0.3)]",
          feature.passes && "border-[var(--color-success)]/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3 w-full">
          <span
            className="px-2 py-1 text-xs font-medium rounded-md"
            style={{ backgroundColor: categoryColor.bg, color: categoryColor.text }}
          >
            {feature.category}
          </span>
          <span className="font-mono text-xs text-[var(--color-text-tertiary)]">
            #{feature.priority}
          </span>
        </div>

        {/* Name */}
        <h3 className="font-display font-semibold text-[var(--color-text-primary)] mb-1 line-clamp-2">
          {feature.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-3">
          {feature.description}
        </p>

        {/* Status */}
        <div className="flex items-center gap-2 text-sm w-full">
          {isInProgress ? (
            <>
              <Loader2 size={14} className="animate-spin text-[var(--color-accent-primary)]" />
              <span className="text-[var(--color-accent-primary)] font-medium">Processing...</span>
            </>
          ) : feature.passes ? (
            <>
              <CheckCircle2 size={14} className="text-[var(--color-success)]" />
              <span className="text-[var(--color-success)] font-medium">Complete</span>
            </>
          ) : (
            <>
              <Circle size={14} className="text-[var(--color-text-tertiary)]" />
              <span className="text-[var(--color-text-tertiary)]">Pending</span>
            </>
          )}
        </div>
      </div>
    </button>
  )
}
