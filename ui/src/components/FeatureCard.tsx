import { useState } from 'react'
import {
  CheckCircle2,
  Circle,
  Loader2,
  GitBranch,
  Eye,
  ArrowRight,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import type { Feature } from '../lib/types'
import { cn } from './aceternity'

interface FeatureCardProps {
  feature: Feature
  onClick: () => void
  isInProgress?: boolean
}

// Generate consistent color for category
function getCategoryColor(category: string): { bg: string; text: string; border: string } {
  const colors = [
    { bg: 'rgba(236, 72, 153, 0.12)', text: '#ec4899', border: 'rgba(236, 72, 153, 0.25)' }, // pink
    { bg: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.25)' }, // blue
    { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981', border: 'rgba(16, 185, 129, 0.25)' }, // green
    { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.25)' }, // yellow
    { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.25)' }, // red
    { bg: 'rgba(139, 92, 246, 0.12)', text: '#8b5cf6', border: 'rgba(139, 92, 246, 0.25)' }, // purple
    { bg: 'rgba(6, 182, 212, 0.12)', text: '#06b6d4', border: 'rgba(6, 182, 212, 0.25)' }, // cyan
  ]

  let hash = 0
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

// Get status configuration for the feature
function getStatusConfig(feature: Feature, isInProgress?: boolean) {
  if (isInProgress) {
    return {
      icon: Loader2,
      label: 'In Progress',
      color: 'text-[var(--color-accent-primary)]',
      bgColor: 'bg-[var(--color-accent-primary)]/10',
      borderColor: 'border-[var(--color-accent-primary)]/30',
      animate: true,
    }
  }
  if (feature.passes) {
    return {
      icon: CheckCircle2,
      label: 'Complete',
      color: 'text-[var(--color-success)]',
      bgColor: 'bg-[var(--color-success)]/10',
      borderColor: 'border-[var(--color-success)]/30',
      animate: false,
    }
  }
  if (feature.blocked_reason) {
    return {
      icon: AlertCircle,
      label: 'Blocked',
      color: 'text-[var(--color-danger)]',
      bgColor: 'bg-[var(--color-danger)]/10',
      borderColor: 'border-[var(--color-danger)]/30',
      animate: false,
    }
  }
  return {
    icon: Circle,
    label: 'Pending',
    color: 'text-[var(--color-text-tertiary)]',
    bgColor: 'bg-[var(--color-bg-tertiary)]',
    borderColor: 'border-[var(--color-border)]',
    animate: false,
  }
}

export function FeatureCard({ feature, onClick, isInProgress }: FeatureCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const categoryColor = getCategoryColor(feature.category)
  const statusConfig = getStatusConfig(feature, isInProgress)
  const StatusIcon = statusConfig.icon

  // Check if feature has dependency-related fields (they may be undefined if not loaded)
  const hasDependencies = feature.blocked_reason || (feature.attempt_count && feature.attempt_count > 1)

  return (
    <button
      onClick={onClick}
      className="w-full text-left group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          "relative w-full p-4 rounded-xl cursor-pointer transition-all duration-200",
          "bg-[var(--color-bg-card)] border",
          // Default border
          !isInProgress && !feature.passes && "border-[var(--color-border)]",
          // In progress state
          isInProgress && "border-[var(--color-accent-primary)] shadow-[0_0_20px_rgba(99,102,241,0.25)]",
          // Complete state
          feature.passes && "border-[var(--color-success)]/40",
          // Blocked state
          feature.blocked_reason && !isInProgress && "border-[var(--color-danger)]/40",
          // Hover effects
          "hover:border-[var(--color-accent-primary)] hover:shadow-[0_0_15px_rgba(99,102,241,0.12)]",
          "hover:translate-y-[-2px]"
        )}
      >
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Category Badge */}
            <span
              className="px-2 py-1 text-xs font-medium rounded-md flex-shrink-0"
              style={{
                backgroundColor: categoryColor.bg,
                color: categoryColor.text,
                border: `1px solid ${categoryColor.border}`
              }}
            >
              {feature.category}
            </span>

            {/* Dependency Indicator */}
            {hasDependencies && (
              <span
                className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded text-xs",
                  feature.blocked_reason
                    ? "bg-[var(--color-danger)]/10 text-[var(--color-danger)]"
                    : "bg-[var(--color-warning)]/10 text-[var(--color-warning)]"
                )}
                title={feature.blocked_reason || `${feature.attempt_count} attempts`}
              >
                {feature.blocked_reason ? (
                  <GitBranch size={10} />
                ) : (
                  <>
                    <RefreshCw size={10} />
                    <span>{feature.attempt_count}</span>
                  </>
                )}
              </span>
            )}
          </div>

          {/* Priority Badge */}
          <span className="font-mono text-xs text-[var(--color-text-tertiary)] flex-shrink-0">
            #{feature.priority}
          </span>
        </div>

        {/* Name */}
        <h3 className="font-display font-semibold text-[var(--color-text-primary)] mb-1.5 line-clamp-2 leading-snug">
          {feature.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-3 leading-relaxed">
          {feature.description}
        </p>

        {/* Footer Row */}
        <div className="flex items-center justify-between">
          {/* Status Badge */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border",
              statusConfig.bgColor,
              statusConfig.color,
              statusConfig.borderColor
            )}
          >
            <StatusIcon
              size={12}
              className={cn(statusConfig.animate && "animate-spin")}
            />
            <span>{statusConfig.label}</span>
          </div>

          {/* Quick Actions - Show on Hover */}
          <div
            className={cn(
              "flex items-center gap-1 transition-all duration-200",
              isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"
            )}
          >
            <span
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-xs",
                "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]",
                "group-hover:bg-[var(--color-accent-primary)]/10 group-hover:text-[var(--color-accent-primary)]"
              )}
            >
              <Eye size={12} />
              <span>View</span>
              <ArrowRight size={10} />
            </span>
          </div>
        </div>

        {/* Steps Preview - Small indicator */}
        {feature.steps && feature.steps.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
              <span className="font-medium">{feature.steps.length} steps</span>
              <div className="flex-1 flex gap-0.5">
                {feature.steps.slice(0, 8).map((_, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "h-1 flex-1 rounded-full max-w-4",
                      feature.passes
                        ? "bg-[var(--color-success)]"
                        : isInProgress && idx === 0
                          ? "bg-[var(--color-accent-primary)] animate-pulse"
                          : "bg-[var(--color-bg-tertiary)]"
                    )}
                  />
                ))}
                {feature.steps.length > 8 && (
                  <span className="text-[10px] text-[var(--color-text-muted)]">+{feature.steps.length - 8}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </button>
  )
}
