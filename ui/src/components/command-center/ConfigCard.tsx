import { FileText, Eye, Pencil } from 'lucide-react'
import type { ConfigFile } from '../../lib/types'
import { cn } from '../aceternity'

interface ConfigCardProps {
  file: ConfigFile
  onView: () => void
  onEdit: () => void
}

/**
 * Get icon background color based on category.
 * Uses the design system's color tokens for consistency.
 */
function getCategoryColor(category: string): { bg: string; text: string; border: string } {
  switch (category) {
    case 'guidance':
      return {
        bg: 'bg-[var(--color-accent-primary)]/15',
        text: 'text-[var(--color-accent-primary)]',
        border: 'border-[var(--color-accent-primary)]/30',
      }
    case 'commands':
      return {
        bg: 'bg-[var(--color-warning)]/15',
        text: 'text-[var(--color-warning)]',
        border: 'border-[var(--color-warning)]/30',
      }
    case 'skills':
      return {
        bg: 'bg-[var(--color-success)]/15',
        text: 'text-[var(--color-success)]',
        border: 'border-[var(--color-success)]/30',
      }
    case 'agents':
      return {
        bg: 'bg-[var(--color-info)]/15',
        text: 'text-[var(--color-info)]',
        border: 'border-[var(--color-info)]/30',
      }
    case 'templates':
      return {
        bg: 'bg-[var(--color-accent-secondary)]/15',
        text: 'text-[var(--color-accent-secondary)]',
        border: 'border-[var(--color-accent-secondary)]/30',
      }
    default:
      return {
        bg: 'bg-[var(--color-bg-tertiary)]',
        text: 'text-[var(--color-text-secondary)]',
        border: 'border-[var(--color-border)]',
      }
  }
}

/**
 * ConfigCard - Individual config file card with neobrutalism styling.
 *
 * Features:
 * - Icon with category-based color
 * - Filename and description
 * - View and Edit action buttons
 * - Bold borders and hover effects
 */
export function ConfigCard({ file, onView, onEdit }: ConfigCardProps) {
  const colors = getCategoryColor(file.category)

  return (
    <div
      className={cn(
        'group relative p-4 rounded-xl transition-all duration-200',
        'bg-[var(--color-bg-card)] border-2 border-[var(--color-border)]',
        'hover:border-[var(--color-accent-primary)] hover:shadow-[4px_4px_0_0_var(--color-accent-primary)]',
        'hover:translate-x-[-2px] hover:translate-y-[-2px]'
      )}
    >
      {/* Header with icon and filename */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className={cn(
            'flex-shrink-0 p-2.5 rounded-lg border',
            colors.bg,
            colors.border
          )}
        >
          <FileText size={18} className={colors.text} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-[var(--color-text-primary)] truncate">
            {file.name}
          </h3>
          <p className="text-xs text-[var(--color-text-tertiary)] font-mono truncate">
            {file.path}
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-4 min-h-[2.5rem]">
        {file.description}
      </p>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onView}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg',
            'bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]',
            'text-[var(--color-text-secondary)]',
            'hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]',
            'hover:border-[var(--color-border-light)]',
            'transition-colors duration-150'
          )}
        >
          <Eye size={14} />
          View
        </button>
        <button
          onClick={onEdit}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg',
            'bg-[var(--color-accent-primary)]/10 border border-[var(--color-accent-primary)]/30',
            'text-[var(--color-accent-primary)]',
            'hover:bg-[var(--color-accent-primary)]/20 hover:border-[var(--color-accent-primary)]/50',
            'transition-colors duration-150'
          )}
        >
          <Pencil size={14} />
          Edit
        </button>
      </div>
    </div>
  )
}

/**
 * ConfigCardSkeleton - Loading placeholder for ConfigCard.
 */
export function ConfigCardSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-[var(--color-bg-card)] border-2 border-[var(--color-border)] animate-pulse">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--color-bg-tertiary)]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-[var(--color-bg-tertiary)]" />
          <div className="h-3 w-1/2 rounded bg-[var(--color-bg-tertiary)]" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 w-full rounded bg-[var(--color-bg-tertiary)]" />
        <div className="h-3 w-2/3 rounded bg-[var(--color-bg-tertiary)]" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-8 w-16 rounded-lg bg-[var(--color-bg-tertiary)]" />
        <div className="h-8 w-16 rounded-lg bg-[var(--color-bg-tertiary)]" />
      </div>
    </div>
  )
}
