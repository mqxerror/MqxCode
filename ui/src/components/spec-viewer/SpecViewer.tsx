/**
 * SpecViewer - Displays the app_spec.txt file with collapsible sections.
 * Fetches the spec using the existing API and parses XML sections for display.
 */

import { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X, FileText, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import * as api from '../../lib/api'
import { cn } from '../aceternity'
import { SpecSection, type ParsedSection, type SectionType } from './SpecSection'

interface SpecViewerProps {
  projectName: string
  className?: string
}

/**
 * Known section types that we have specific styling for.
 * Order determines display order in the viewer.
 */
const KNOWN_SECTIONS: SectionType[] = [
  'overview',
  'technology_stack',
  'prerequisites',
  'core_features',
  'database_schema',
  'api_endpoints_summary',
  'ui_layout',
  'design_system',
  'key_interactions',
  'implementation_steps',
  'success_criteria',
]

/**
 * Parses XML-style app spec content into sections.
 * Handles nested tags and extracts content.
 */
function parseSpecContent(specContent: string): ParsedSection[] {
  const sections: ParsedSection[] = []

  // Remove XML comments
  const cleanContent = specContent.replace(/<!--[\s\S]*?-->/g, '')

  // Extract project name if present
  const projectNameMatch = cleanContent.match(/<project_name>([\s\S]*?)<\/project_name>/i)
  if (projectNameMatch) {
    sections.push({
      name: 'project_name',
      type: 'overview',
      content: projectNameMatch[1].trim(),
      itemCount: undefined,
    })
  }

  // Parse each known section
  for (const sectionName of KNOWN_SECTIONS) {
    const regex = new RegExp(`<${sectionName}>([\\s\\S]*?)<\\/${sectionName}>`, 'i')
    const match = cleanContent.match(regex)

    if (match) {
      const content = match[1].trim()

      // Count items (list items starting with -)
      const listItems = content.match(/^[\s]*-/gm)
      const itemCount = listItems ? listItems.length : undefined

      sections.push({
        name: sectionName,
        type: sectionName as SectionType,
        content,
        itemCount,
      })
    }
  }

  // Find any additional sections not in known list
  const allSectionRegex = /<(\w+)>([\s\S]*?)<\/\1>/g
  let additionalMatch
  const foundNames = new Set(sections.map(s => s.name))
  const skipSections = new Set(['project_specification', 'project_name', ...KNOWN_SECTIONS])

  while ((additionalMatch = allSectionRegex.exec(cleanContent)) !== null) {
    const sectionName = additionalMatch[1].toLowerCase()
    if (!foundNames.has(sectionName) && !skipSections.has(sectionName)) {
      const content = additionalMatch[2].trim()
      const listItems = content.match(/^[\s]*-/gm)

      sections.push({
        name: sectionName,
        type: 'default',
        content,
        itemCount: listItems ? listItems.length : undefined,
      })
      foundNames.add(sectionName)
    }
  }

  return sections
}

/**
 * Filters sections based on search query.
 */
function filterSections(sections: ParsedSection[], query: string): ParsedSection[] {
  if (!query.trim()) return sections

  const lowerQuery = query.toLowerCase()
  return sections.filter(
    section =>
      section.name.toLowerCase().includes(lowerQuery) ||
      section.content.toLowerCase().includes(lowerQuery)
  )
}

export function SpecViewer({ projectName, className }: SpecViewerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [allExpanded, setAllExpanded] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Fetch project prompts (includes app_spec)
  const {
    data: prompts,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['project-prompts', projectName],
    queryFn: () => api.getProjectPrompts(projectName),
    enabled: !!projectName,
    staleTime: 60000, // Cache for 1 minute
  })

  // Parse the spec content into sections
  const sections = useMemo(() => {
    if (!prompts?.app_spec) return []
    return parseSpecContent(prompts.app_spec)
  }, [prompts?.app_spec])

  // Filter sections based on search
  const filteredSections = useMemo(() => {
    return filterSections(sections, searchQuery)
  }, [sections, searchQuery])

  // Handle keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + F to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      // Escape to clear search
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('')
        searchInputRef.current?.blur()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [searchQuery])

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16', className)}>
        <Loader2 className="animate-spin text-[var(--color-accent-primary)] mb-4" size={32} />
        <p className="text-[var(--color-text-secondary)] text-sm">Loading specification...</p>
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16', className)}>
        <div className="p-4 bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 rounded-xl text-center max-w-md">
          <AlertCircle className="mx-auto mb-3 text-[var(--color-error)]" size={32} />
          <p className="text-[var(--color-error)] font-medium mb-2">Failed to load specification</p>
          <p className="text-[var(--color-text-tertiary)] text-sm mb-4">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
          <button
            onClick={() => refetch()}
            className="btn btn-secondary text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Empty state (no spec content)
  if (!prompts?.app_spec || sections.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16', className)}>
        <div className="p-8 bg-[var(--color-bg-secondary)] border-2 border-dashed border-[var(--color-border)] rounded-2xl text-center max-w-md">
          <FileText className="mx-auto mb-4 text-[var(--color-text-tertiary)]" size={48} />
          <h3 className="font-display font-semibold text-[var(--color-text-primary)] mb-2">
            No Specification Found
          </h3>
          <p className="text-[var(--color-text-secondary)] text-sm">
            This project does not have an app specification file yet. Create one using the spec
            creation wizard or add an app_spec.txt file to the project's prompts directory.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with search and controls */}
      <div className="flex-shrink-0 p-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText className="text-[var(--color-accent-primary)]" size={20} />
            <h2 className="font-display font-semibold text-[var(--color-text-primary)]">
              App Specification
            </h2>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]">
              {sections.length} sections
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Expand/Collapse All */}
            <button
              onClick={() => setAllExpanded(!allExpanded)}
              className="btn btn-ghost text-xs py-1.5 px-2.5"
              title={allExpanded ? 'Collapse all sections' : 'Expand all sections'}
            >
              {allExpanded ? (
                <>
                  <ChevronUp size={14} />
                  <span className="hidden sm:inline">Collapse All</span>
                </>
              ) : (
                <>
                  <ChevronDown size={14} />
                  <span className="hidden sm:inline">Expand All</span>
                </>
              )}
            </button>

            {/* Search */}
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg transition-all duration-200',
                'bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]',
                isSearchFocused && 'border-[var(--color-accent-primary)] ring-2 ring-[var(--color-accent-primary)]/20'
              )}
            >
              <Search
                size={16}
                className="ml-3 text-[var(--color-text-tertiary)]"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Search spec..."
                className="w-32 sm:w-48 py-2 pr-2 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mr-2 p-1 rounded hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-tertiary)]"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search results indicator */}
        {searchQuery && (
          <div className="mt-2 text-xs text-[var(--color-text-tertiary)]">
            {filteredSections.length === 0 ? (
              <span>No sections match "{searchQuery}"</span>
            ) : (
              <span>
                Found {filteredSections.length} section{filteredSections.length !== 1 ? 's' : ''} matching "{searchQuery}"
              </span>
            )}
          </div>
        )}
      </div>

      {/* Sections list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {filteredSections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="mb-3 text-[var(--color-text-tertiary)]" size={32} />
            <p className="text-[var(--color-text-secondary)] text-sm">
              No sections found matching your search.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-[var(--color-accent-primary)] text-sm hover:underline"
            >
              Clear search
            </button>
          </div>
        ) : (
          filteredSections.map((section, index) => (
            <SpecSection
              key={section.name}
              section={section}
              defaultExpanded={allExpanded || (index === 0 && !searchQuery)}
              searchQuery={searchQuery}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default SpecViewer
