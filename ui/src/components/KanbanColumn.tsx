import { useState, useRef, useEffect } from 'react'
import { FeatureCard } from './FeatureCard'
import { Plus, Sparkles, Search, X } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import type { Feature } from '../lib/types'
import { cn } from './aceternity'

interface KanbanColumnProps {
  title: string
  count: number
  features: Feature[]
  color: 'pending' | 'progress' | 'done'
  onFeatureClick: (feature: Feature) => void
  onAddFeature?: () => void
  onExpandProject?: () => void
  showExpandButton?: boolean
  searchQuery?: string
  onSearchChange?: (query: string) => void
  showSearch?: boolean
}

const colorConfig = {
  pending: {
    accent: 'var(--color-warning)',
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.3)',
    glow: 'rgba(245, 158, 11, 0.2)',
    lampColor: '#f59e0b',
  },
  progress: {
    accent: 'var(--color-accent-primary)',
    bg: 'rgba(99, 102, 241, 0.1)',
    border: 'rgba(99, 102, 241, 0.3)',
    glow: 'rgba(99, 102, 241, 0.2)',
    lampColor: '#6366f1',
  },
  done: {
    accent: 'var(--color-success)',
    bg: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.3)',
    glow: 'rgba(16, 185, 129, 0.2)',
    lampColor: '#10b981',
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
  searchQuery = '',
  onSearchChange,
  showSearch = false,
}: KanbanColumnProps) {
  const config = colorConfig[color]
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Focus input when search expands
  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchExpanded])

  // Close search when query is cleared and user clicks away
  const handleSearchBlur = () => {
    if (!searchQuery) {
      setIsSearchExpanded(false)
    }
  }

  const handleClearSearch = () => {
    onSearchChange?.('')
    setIsSearchExpanded(false)
  }

  return (
    <div
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
          borderTop: `3px solid ${config.accent}`,
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
          {(onAddFeature || onExpandProject || showSearch) && (
            <div className="flex items-center gap-2">
              {/* Search */}
              {showSearch && (
                <div className="flex items-center">
                  {isSearchExpanded ? (
                    <div className="flex items-center gap-1 animate-fade-in">
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange?.(e.target.value)}
                        onBlur={handleSearchBlur}
                        placeholder="Search..."
                        className="w-32 text-xs py-1.5 px-2 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-accent-primary)]"
                      />
                      <button
                        onClick={handleClearSearch}
                        className="btn btn-ghost btn-icon p-1"
                        title="Clear search"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsSearchExpanded(true)}
                      className="btn btn-ghost btn-icon p-1.5"
                      title="Search features"
                    >
                      <Search size={14} />
                    </button>
                  )}
                </div>
              )}
              {onAddFeature && (
                <button
                  onClick={onAddFeature}
                  className="btn btn-primary text-xs py-1.5 px-2.5"
                  title="Add new feature (N)"
                >
                  <Plus size={14} />
                </button>
              )}
              {onExpandProject && showExpandButton && (
                <button
                  onClick={onExpandProject}
                  className="btn btn-secondary text-xs py-1.5 px-2.5"
                  title="Expand project with AI (E)"
                >
                  <Sparkles size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="p-3 space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin bg-[var(--color-bg-primary)]/50">
        <AnimatePresence mode="popLayout">
          {features.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-text-tertiary)]">
              <p className="text-sm">No features</p>
            </div>
          ) : (
            features.map((feature) => (
              <div key={feature.id}>
                <FeatureCard
                  feature={feature}
                  onClick={() => onFeatureClick(feature)}
                  isInProgress={color === 'progress'}
                />
              </div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
