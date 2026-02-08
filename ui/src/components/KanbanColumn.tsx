import { useState, useRef, useEffect, useMemo } from 'react'
import { FeatureCard } from './FeatureCard'
import { Plus, Sparkles, Search, X, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Feature } from '../lib/types'
import { cn } from './aceternity'

// Performance: limit initial render to prevent DOM overload with 100+ features
const INITIAL_VISIBLE = 30
const LOAD_MORE_INCREMENT = 30
// Only stagger animate the first N items for smooth entrance
const MAX_STAGGER_ITEMS = 8

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
    bg: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.25)',
    glow: 'rgba(245, 158, 11, 0.15)',
  },
  progress: {
    accent: 'var(--color-accent-primary)',
    bg: 'rgba(99, 102, 241, 0.08)',
    border: 'rgba(99, 102, 241, 0.25)',
    glow: 'rgba(99, 102, 241, 0.15)',
  },
  done: {
    accent: 'var(--color-success)',
    bg: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(16, 185, 129, 0.25)',
    glow: 'rgba(16, 185, 129, 0.15)',
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
  const [showCategoryFilter, setShowCategoryFilter] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const filterDropdownRef = useRef<HTMLDivElement>(null)

  // Get unique categories from features
  const categories = useMemo(() => {
    const cats = new Set(features.map(f => f.category))
    return Array.from(cats).sort()
  }, [features])

  // Filter features by category (local filter on top of search)
  const filteredByCategory = useMemo(() => {
    if (!selectedCategory) return features
    return features.filter(f => f.category === selectedCategory)
  }, [features, selectedCategory])

  // Performance: only render up to visibleCount items to avoid DOM overload
  const displayFeatures = useMemo(() => {
    return filteredByCategory.slice(0, visibleCount)
  }, [filteredByCategory, visibleCount])

  const hasMore = filteredByCategory.length > visibleCount
  const remainingCount = filteredByCategory.length - visibleCount

  // Reset visible count when features list changes significantly (new project, filter change)
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE)
  }, [selectedCategory])

  // Focus input when search expands
  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchExpanded])

  // Close filter dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryFilter(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category)
    setShowCategoryFilter(false)
  }

  // Keyboard shortcut handler for search (when focused)
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClearSearch()
      searchInputRef.current?.blur()
    }
  }

  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden flex flex-col",
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
        <div className="flex items-center justify-between gap-2">
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
            {/* Category filter indicator */}
            {selectedCategory && (
              <span
                className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full cursor-pointer hover:opacity-80"
                style={{
                  backgroundColor: config.bg,
                  color: config.accent,
                  border: `1px solid ${config.border}`
                }}
                onClick={() => handleCategorySelect(null)}
                title="Click to clear filter"
              >
                <Filter size={10} />
                {selectedCategory}
                <X size={10} />
              </span>
            )}
          </div>

          {/* Actions */}
          {(onAddFeature || onExpandProject || showSearch) && (
            <div className="flex items-center gap-1.5">
              {/* Search */}
              {showSearch && (
                <div className="flex items-center">
                  <AnimatePresence mode="wait">
                    {isSearchExpanded ? (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="flex items-center gap-1"
                      >
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={searchQuery}
                          onChange={(e) => onSearchChange?.(e.target.value)}
                          onBlur={handleSearchBlur}
                          onKeyDown={handleSearchKeyDown}
                          placeholder="Search... (Esc to close)"
                          className="w-36 text-xs py-1.5 px-2 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-accent-primary)]"
                        />
                        <button
                          onClick={handleClearSearch}
                          className="p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                          title="Clear search (Esc)"
                        >
                          <X size={14} />
                        </button>
                      </motion.div>
                    ) : (
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsSearchExpanded(true)}
                        className="p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                        title="Search features (/)"
                      >
                        <Search size={14} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Category Filter */}
              {showSearch && categories.length > 1 && (
                <div className="relative" ref={filterDropdownRef}>
                  <button
                    onClick={() => setShowCategoryFilter(!showCategoryFilter)}
                    className={cn(
                      "p-1.5 rounded-lg text-[var(--color-text-tertiary)]",
                      showCategoryFilter || selectedCategory
                        ? "bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)]"
                        : "hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
                    )}
                    title="Filter by category"
                  >
                    <Filter size={14} />
                  </button>

                  {/* Category Dropdown */}
                  <AnimatePresence>
                    {showCategoryFilter && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute right-0 top-full mt-1 z-50 min-w-[140px] py-1 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] shadow-lg"
                      >
                        <button
                          onClick={() => handleCategorySelect(null)}
                          className={cn(
                            "w-full px-3 py-1.5 text-left text-xs flex items-center gap-2",
                            "hover:bg-[var(--color-bg-tertiary)]",
                            !selectedCategory && "text-[var(--color-accent-primary)]"
                          )}
                        >
                          <span>All categories</span>
                          {!selectedCategory && <ChevronDown size={12} className="ml-auto rotate-180" />}
                        </button>
                        <div className="h-px bg-[var(--color-border)] my-1" />
                        {categories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => handleCategorySelect(cat)}
                            className={cn(
                              "w-full px-3 py-1.5 text-left text-xs flex items-center gap-2",
                              "hover:bg-[var(--color-bg-tertiary)]",
                              selectedCategory === cat && "text-[var(--color-accent-primary)]"
                            )}
                          >
                            <span className="truncate">{cat}</span>
                            {selectedCategory === cat && <ChevronDown size={12} className="ml-auto rotate-180" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Add Feature */}
              {onAddFeature && (
                <button
                  onClick={onAddFeature}
                  className="btn btn-primary text-xs py-1.5 px-2.5"
                  title="Add new feature (N)"
                >
                  <Plus size={14} />
                  <span className="hidden sm:inline">Add</span>
                </button>
              )}

              {/* Expand Project */}
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

      {/* Cards Container */}
      <div className="p-3 space-y-3 flex-1 max-h-[500px] overflow-y-auto scrollbar-thin bg-[var(--color-bg-primary)]/50">
        <AnimatePresence mode="sync">
          {displayFeatures.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 text-[var(--color-text-tertiary)]"
            >
              <p className="text-sm">
                {features.length === 0
                  ? "No features"
                  : selectedCategory
                    ? `No ${selectedCategory} features`
                    : "No matching features"
                }
              </p>
            </motion.div>
          ) : (
            displayFeatures.map((feature, index) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                // Only stagger-animate the first N items; render the rest instantly
                transition={index < MAX_STAGGER_ITEMS ? { delay: index * 0.03 } : { duration: 0.15 }}
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

        {/* Load more button for large lists */}
        {hasMore && (
          <button
            onClick={() => setVisibleCount(prev => prev + LOAD_MORE_INCREMENT)}
            className={cn(
              "w-full py-2.5 px-3 rounded-xl text-xs font-medium",
              "bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]",
              "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
              "hover:border-[var(--color-border-light)] hover:bg-[var(--color-bg-elevated)]",
              "transition-all duration-200"
            )}
          >
            Show more ({remainingCount} remaining)
          </button>
        )}

        {/* Collapse button when expanded beyond initial */}
        {!hasMore && visibleCount > INITIAL_VISIBLE && filteredByCategory.length > INITIAL_VISIBLE && (
          <button
            onClick={() => setVisibleCount(INITIAL_VISIBLE)}
            className={cn(
              "w-full py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1",
              "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]",
              "transition-all duration-200"
            )}
          >
            <ChevronUp size={12} />
            Show less
          </button>
        )}
      </div>

      {/* Footer with count info */}
      {(displayFeatures.length > 0 && (displayFeatures.length !== features.length || hasMore)) && (
        <div className="px-4 py-2 border-t border-[var(--color-border)] text-xs text-[var(--color-text-tertiary)] bg-[var(--color-bg-secondary)]">
          Showing {displayFeatures.length} of {filteredByCategory.length} features
          {selectedCategory && ` (filtered from ${features.length})`}
        </div>
      )}
    </div>
  )
}
