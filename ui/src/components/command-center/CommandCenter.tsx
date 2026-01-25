import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Settings2,
  Zap,
  Sparkles,
  Bot,
  FileCode,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { getClaudeConfig, getConfigFile, updateConfigFile } from '../../lib/api'
import type { ClaudeConfig, ConfigFile } from '../../lib/types'
import { ConfigCard } from './ConfigCard'
import { ConfigEditor } from './ConfigEditor'
import { cn } from '../aceternity'

/**
 * Category configuration for the Command Center.
 * Each category has an icon, title, description, and color scheme.
 */
const CATEGORY_CONFIG = {
  guidance: {
    icon: Settings2,
    title: 'Guidance',
    description: 'Project-level instructions for Claude',
    color: 'var(--color-accent-primary)',
    bgColor: 'bg-[var(--color-accent-primary)]/15',
    borderColor: 'border-[var(--color-accent-primary)]/30',
  },
  commands: {
    icon: Zap,
    title: 'Commands',
    description: 'Slash commands for common tasks',
    color: 'var(--color-warning)',
    bgColor: 'bg-[var(--color-warning)]/15',
    borderColor: 'border-[var(--color-warning)]/30',
  },
  skills: {
    icon: Sparkles,
    title: 'Skills',
    description: 'Specialized capabilities and domain knowledge',
    color: 'var(--color-success)',
    bgColor: 'bg-[var(--color-success)]/15',
    borderColor: 'border-[var(--color-success)]/30',
  },
  agents: {
    icon: Bot,
    title: 'Agents',
    description: 'Agent configurations and behaviors',
    color: 'var(--color-info)',
    bgColor: 'bg-[var(--color-info)]/15',
    borderColor: 'border-[var(--color-info)]/30',
  },
  templates: {
    icon: FileCode,
    title: 'Templates',
    description: 'Prompt templates for project generation',
    color: 'var(--color-accent-secondary)',
    bgColor: 'bg-[var(--color-accent-secondary)]/15',
    borderColor: 'border-[var(--color-accent-secondary)]/30',
  },
} as const

type CategoryKey = keyof typeof CATEGORY_CONFIG

interface ExpandedCategories {
  [key: string]: boolean
}

interface EditorState {
  isOpen: boolean
  file: ConfigFile | null
  content: string
  isLoading: boolean
  error: string | null
  readOnly: boolean
}

/**
 * CommandCenter - Main container component for config file management.
 *
 * Features:
 * - Grid of config category cards
 * - Expandable categories showing files
 * - View/Edit modals for config files
 * - Loading and error states
 * - Refresh capability
 */
export function CommandCenter() {
  const queryClient = useQueryClient()

  // Fetch config data
  const {
    data: config,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ClaudeConfig>({
    queryKey: ['claude-config'],
    queryFn: getClaudeConfig,
  })

  // Track expanded categories
  const [expandedCategories, setExpandedCategories] = useState<ExpandedCategories>({})

  // Editor state
  const [editorState, setEditorState] = useState<EditorState>({
    isOpen: false,
    file: null,
    content: '',
    isLoading: false,
    error: null,
    readOnly: false,
  })

  // Toggle category expansion
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }))
  }, [])

  // Open file for viewing
  const handleView = useCallback(async (file: ConfigFile) => {
    setEditorState({
      isOpen: true,
      file,
      content: '',
      isLoading: true,
      error: null,
      readOnly: true,
    })

    try {
      const result = await getConfigFile(file.category, file.name)
      setEditorState((prev) => ({
        ...prev,
        content: result.content,
        isLoading: false,
      }))
    } catch (err) {
      setEditorState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load file',
      }))
    }
  }, [])

  // Open file for editing
  const handleEdit = useCallback(async (file: ConfigFile) => {
    setEditorState({
      isOpen: true,
      file,
      content: '',
      isLoading: true,
      error: null,
      readOnly: false,
    })

    try {
      const result = await getConfigFile(file.category, file.name)
      setEditorState((prev) => ({
        ...prev,
        content: result.content,
        isLoading: false,
      }))
    } catch (err) {
      setEditorState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load file',
      }))
    }
  }, [])

  // Close editor
  const handleCloseEditor = useCallback(() => {
    setEditorState({
      isOpen: false,
      file: null,
      content: '',
      isLoading: false,
      error: null,
      readOnly: false,
    })
  }, [])

  // Save file mutation
  const saveMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!editorState.file) throw new Error('No file selected')
      return updateConfigFile(
        editorState.file.category,
        editorState.file.name,
        content
      )
    },
    onSuccess: () => {
      // Invalidate config query to refresh descriptions
      queryClient.invalidateQueries({ queryKey: ['claude-config'] })
    },
  })

  // Handle save from editor
  const handleSave = useCallback(async (content: string) => {
    await saveMutation.mutateAsync(content)
  }, [saveMutation])

  // Get files for a category
  const getCategoryFiles = useCallback(
    (category: CategoryKey): ConfigFile[] => {
      if (!config) return []
      return config[category] || []
    },
    [config]
  )

  // Render category section
  const renderCategory = useCallback(
    (category: CategoryKey) => {
      const categoryConfig = CATEGORY_CONFIG[category]
      const Icon = categoryConfig.icon
      const files = getCategoryFiles(category)
      const isExpanded = expandedCategories[category]
      const hasFiles = files.length > 0

      return (
        <div key={category} className="space-y-3">
          {/* Category header */}
          <button
            onClick={() => toggleCategory(category)}
            className={cn(
              'w-full flex items-center gap-3 p-4 rounded-xl transition-all duration-200',
              'bg-[var(--color-bg-card)] border-2 border-[var(--color-border)]',
              'hover:border-[var(--color-border-light)]',
              isExpanded && 'border-[var(--color-border-light)]'
            )}
          >
            <div
              className={cn(
                'flex-shrink-0 p-2.5 rounded-lg border',
                categoryConfig.bgColor,
                categoryConfig.borderColor
              )}
            >
              <Icon size={20} style={{ color: categoryConfig.color }} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-display font-semibold text-[var(--color-text-primary)]">
                {categoryConfig.title}
              </h3>
              <p className="text-sm text-[var(--color-text-tertiary)]">
                {hasFiles ? `${files.length} file${files.length > 1 ? 's' : ''}` : 'No files'}
              </p>
            </div>
            <div className="text-[var(--color-text-tertiary)]">
              {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </div>
          </button>

          {/* Expanded file list */}
          {isExpanded && hasFiles && (
            <div className="grid gap-3 pl-4 animate-fade-in-up">
              {files.map((file) => (
                <ConfigCard
                  key={file.path}
                  file={file}
                  onView={() => handleView(file)}
                  onEdit={() => handleEdit(file)}
                />
              ))}
            </div>
          )}

          {isExpanded && !hasFiles && (
            <div className="pl-4 py-4 text-center text-[var(--color-text-tertiary)] text-sm animate-fade-in">
              No files in this category
            </div>
          )}
        </div>
      )
    },
    [expandedCategories, getCategoryFiles, toggleCategory, handleView, handleEdit]
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <CommandCenterHeader onRefresh={refetch} isRefreshing={false} />
        <div className="space-y-4">
          {Object.keys(CATEGORY_CONFIG).map((cat) => (
            <div key={cat} className="animate-pulse">
              <div className="h-20 rounded-xl bg-[var(--color-bg-card)] border-2 border-[var(--color-border)]" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className="p-6 space-y-6">
        <CommandCenterHeader onRefresh={refetch} isRefreshing={false} />
        <div className="flex flex-col items-center justify-center py-12">
          <div className="p-4 rounded-xl bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 max-w-md">
            <div className="flex items-center gap-2 text-[var(--color-error)] mb-2">
              <AlertCircle size={20} />
              <span className="font-semibold">Failed to load configuration</span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
            <button
              onClick={() => refetch()}
              className={cn(
                'mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg',
                'bg-[var(--color-error)]/10 text-[var(--color-error)]',
                'hover:bg-[var(--color-error)]/20',
                'transition-colors'
              )}
            >
              <RefreshCw size={16} />
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <CommandCenterHeader
        onRefresh={refetch}
        isRefreshing={isLoading}
      />

      {/* Category grid */}
      <div className="space-y-4">
        {(Object.keys(CATEGORY_CONFIG) as CategoryKey[]).map(renderCategory)}
      </div>

      {/* Config Editor Modal */}
      <ConfigEditor
        isOpen={editorState.isOpen}
        onClose={handleCloseEditor}
        filename={editorState.file?.name || ''}
        path={editorState.file?.path || ''}
        category={editorState.file?.category || ''}
        content={editorState.content}
        isLoading={editorState.isLoading}
        error={editorState.error}
        onSave={handleSave}
        readOnly={editorState.readOnly}
      />
    </div>
  )
}

/**
 * CommandCenterHeader - Header component with title and refresh button.
 */
function CommandCenterHeader({
  onRefresh,
  isRefreshing,
}: {
  onRefresh: () => void
  isRefreshing: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
          Command Center
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Manage Claude configuration files, commands, skills, and templates
        </p>
      </div>
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg',
          'bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]',
          'text-[var(--color-text-secondary)]',
          'hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors'
        )}
        title="Refresh configuration"
      >
        {isRefreshing ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <RefreshCw size={16} />
        )}
        Refresh
      </button>
    </div>
  )
}

/**
 * CommandCenterCompact - A more compact version for sidebars/panels.
 * Shows summary cards instead of expandable sections.
 */
export function CommandCenterCompact() {
  const { data: config, isLoading } = useQuery<ClaudeConfig>({
    queryKey: ['claude-config'],
    queryFn: getClaudeConfig,
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-[var(--color-bg-tertiary)] animate-pulse" />
        ))}
      </div>
    )
  }

  const categories = Object.keys(CATEGORY_CONFIG) as CategoryKey[]

  return (
    <div className="space-y-3">
      {categories.map((category) => {
        const categoryConfig = CATEGORY_CONFIG[category]
        const Icon = categoryConfig.icon
        const files = config?.[category] || []

        return (
          <div
            key={category}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg',
              'bg-[var(--color-bg-card)] border border-[var(--color-border)]',
              'hover:border-[var(--color-border-light)]',
              'transition-colors cursor-pointer'
            )}
          >
            <div
              className={cn(
                'flex-shrink-0 p-2 rounded-md',
                categoryConfig.bgColor
              )}
            >
              <Icon size={16} style={{ color: categoryConfig.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                {categoryConfig.title}
              </p>
              <p className="text-xs text-[var(--color-text-tertiary)]">
                {files.length} file{files.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default CommandCenter
