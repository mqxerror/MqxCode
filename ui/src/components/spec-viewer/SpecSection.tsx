/**
 * SpecSection - Individual collapsible section for the app spec viewer.
 * Displays a single parsed XML section with syntax highlighting for code blocks.
 */

import { useState, useRef, useEffect } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Info,
  Cpu,
  Layers,
  Database,
  Globe,
  Palette,
  Settings,
  FileText,
  Target,
  LayoutDashboard,
  Workflow,
  CheckCircle,
} from 'lucide-react'
import { cn } from '../aceternity'

// Section type configurations with colors and icons
export type SectionType =
  | 'overview'
  | 'technology_stack'
  | 'prerequisites'
  | 'core_features'
  | 'database_schema'
  | 'api_endpoints_summary'
  | 'design_system'
  | 'ui_layout'
  | 'key_interactions'
  | 'implementation_steps'
  | 'success_criteria'
  | 'default'

interface SectionConfig {
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
  label: string
}

const sectionConfigs: Record<SectionType, SectionConfig> = {
  overview: {
    icon: Info,
    color: '#3b82f6', // blue
    bgColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    label: 'Overview',
  },
  technology_stack: {
    icon: Cpu,
    color: '#8b5cf6', // purple
    bgColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    label: 'Technology Stack',
  },
  prerequisites: {
    icon: Settings,
    color: '#64748b', // slate
    bgColor: 'rgba(100, 116, 139, 0.1)',
    borderColor: 'rgba(100, 116, 139, 0.3)',
    label: 'Prerequisites',
  },
  core_features: {
    icon: Layers,
    color: '#10b981', // green
    bgColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    label: 'Core Features',
  },
  database_schema: {
    icon: Database,
    color: '#f59e0b', // orange
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    label: 'Database Schema',
  },
  api_endpoints_summary: {
    icon: Globe,
    color: '#06b6d4', // cyan
    bgColor: 'rgba(6, 182, 212, 0.1)',
    borderColor: 'rgba(6, 182, 212, 0.3)',
    label: 'API Endpoints',
  },
  design_system: {
    icon: Palette,
    color: '#ec4899', // pink
    bgColor: 'rgba(236, 72, 153, 0.1)',
    borderColor: 'rgba(236, 72, 153, 0.3)',
    label: 'Design System',
  },
  ui_layout: {
    icon: LayoutDashboard,
    color: '#14b8a6', // teal
    bgColor: 'rgba(20, 184, 166, 0.1)',
    borderColor: 'rgba(20, 184, 166, 0.3)',
    label: 'UI Layout',
  },
  key_interactions: {
    icon: Workflow,
    color: '#f97316', // orange-bright
    bgColor: 'rgba(249, 115, 22, 0.1)',
    borderColor: 'rgba(249, 115, 22, 0.3)',
    label: 'Key Interactions',
  },
  implementation_steps: {
    icon: Target,
    color: '#6366f1', // indigo
    bgColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    label: 'Implementation Steps',
  },
  success_criteria: {
    icon: CheckCircle,
    color: '#22c55e', // green-bright
    bgColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    label: 'Success Criteria',
  },
  default: {
    icon: FileText,
    color: '#71717a', // zinc
    bgColor: 'rgba(113, 113, 122, 0.1)',
    borderColor: 'rgba(113, 113, 122, 0.3)',
    label: 'Section',
  },
}

export interface ParsedSection {
  name: string
  type: SectionType
  content: string
  itemCount?: number
}

interface SpecSectionProps {
  section: ParsedSection
  defaultExpanded?: boolean
  searchQuery?: string
}

/**
 * Highlights matching text within content based on search query.
 */
function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)

  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="bg-[var(--color-warning)]/30 text-[var(--color-text-primary)] rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

/**
 * Renders content with basic syntax highlighting for code-like elements.
 */
function renderContent(content: string, searchQuery?: string): React.ReactNode {
  const lines = content.split('\n')

  return lines.map((line, index) => {
    const trimmed = line.trim()

    // Empty line
    if (!trimmed) {
      return <br key={index} />
    }

    // List item (bullet point)
    if (trimmed.startsWith('-')) {
      const listContent = trimmed.slice(1).trim()
      return (
        <div key={index} className="flex items-start gap-2 py-0.5">
          <span className="text-[var(--color-text-tertiary)] mt-1.5 text-xs">-</span>
          <span className="text-[var(--color-text-secondary)]">
            {searchQuery ? highlightText(listContent, searchQuery) : listContent}
          </span>
        </div>
      )
    }

    // Sub-section header (e.g., <frontend>, <backend>)
    const subSectionMatch = trimmed.match(/^<(\w+)>$/)
    if (subSectionMatch) {
      return (
        <div key={index} className="mt-3 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent-primary)]">
            {searchQuery ? highlightText(subSectionMatch[1].replace(/_/g, ' '), searchQuery) : subSectionMatch[1].replace(/_/g, ' ')}
          </span>
        </div>
      )
    }

    // Closing tag - skip
    if (trimmed.match(/^<\/\w+>$/)) {
      return null
    }

    // XML element with content (e.g., <framework>React</framework>)
    const elementMatch = trimmed.match(/^<(\w+)>(.+)<\/\1>$/)
    if (elementMatch) {
      return (
        <div key={index} className="flex items-center gap-2 py-0.5">
          <span className="text-xs font-medium text-[var(--color-text-tertiary)] min-w-[100px]">
            {searchQuery ? highlightText(elementMatch[1].replace(/_/g, ' '), searchQuery) : elementMatch[1].replace(/_/g, ' ')}:
          </span>
          <span className="text-[var(--color-text-primary)] font-mono text-sm">
            {searchQuery ? highlightText(elementMatch[2], searchQuery) : elementMatch[2]}
          </span>
        </div>
      )
    }

    // Numbered step header
    const stepMatch = trimmed.match(/^<step\s+number="(\d+)">$/)
    if (stepMatch) {
      return (
        <div key={index} className="mt-4 mb-2 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-accent-primary)] text-white text-xs font-bold">
            {stepMatch[1]}
          </span>
        </div>
      )
    }

    // Title element
    const titleMatch = trimmed.match(/^<title>(.+)<\/title>$/)
    if (titleMatch) {
      return (
        <div key={index} className="font-semibold text-[var(--color-text-primary)] mb-2">
          {searchQuery ? highlightText(titleMatch[1], searchQuery) : titleMatch[1]}
        </div>
      )
    }

    // Tasks container - skip
    if (trimmed === '<tasks>' || trimmed === '</tasks>') {
      return null
    }

    // Default: regular text
    return (
      <div key={index} className="py-0.5 text-[var(--color-text-secondary)]">
        {searchQuery ? highlightText(trimmed, searchQuery) : trimmed}
      </div>
    )
  })
}

export function SpecSection({ section, defaultExpanded = false, searchQuery }: SpecSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined)

  const config = sectionConfigs[section.type] || sectionConfigs.default
  const Icon = config.icon

  // Automatically expand if search matches this section
  useEffect(() => {
    if (searchQuery && section.content.toLowerCase().includes(searchQuery.toLowerCase())) {
      setIsExpanded(true)
    }
  }, [searchQuery, section.content])

  // Calculate content height for smooth animation
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [section.content, isExpanded])

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden transition-all duration-200',
        'bg-[var(--color-bg-card)] border border-[var(--color-border)]',
        isExpanded && 'shadow-lg'
      )}
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: config.color,
      }}
    >
      {/* Header - clickable to toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-4 py-3',
          'hover:bg-[var(--color-bg-tertiary)] transition-colors duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)] focus-visible:ring-inset'
        )}
        aria-expanded={isExpanded}
        aria-controls={`section-content-${section.name}`}
      >
        <div className="flex items-center gap-3">
          {/* Expand/Collapse icon */}
          <span className="text-[var(--color-text-tertiary)]">
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>

          {/* Section icon */}
          <div
            className="p-1.5 rounded-lg"
            style={{ backgroundColor: config.bgColor }}
          >
            <Icon size={16} style={{ color: config.color }} />
          </div>

          {/* Section label */}
          <span
            className="font-display font-semibold text-sm"
            style={{ color: config.color }}
          >
            {searchQuery ? highlightText(config.label, searchQuery) : config.label}
          </span>

          {/* Item count badge */}
          {section.itemCount !== undefined && section.itemCount > 0 && (
            <span
              className="px-2 py-0.5 text-xs font-medium rounded-full"
              style={{
                backgroundColor: config.bgColor,
                color: config.color,
                border: `1px solid ${config.borderColor}`,
              }}
            >
              {section.itemCount}
            </span>
          )}
        </div>

        {/* Color indicator dot */}
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: config.color }}
        />
      </button>

      {/* Content - animated expand/collapse */}
      <div
        id={`section-content-${section.name}`}
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{
          maxHeight: isExpanded ? contentHeight : 0,
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div
          ref={contentRef}
          className="px-4 pb-4 pt-2 border-t border-[var(--color-border)]"
          style={{
            borderTopColor: config.borderColor,
          }}
        >
          <div className="font-mono text-sm leading-relaxed">
            {renderContent(section.content, searchQuery)}
          </div>
        </div>
      </div>
    </div>
  )
}
