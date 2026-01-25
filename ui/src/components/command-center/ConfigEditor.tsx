import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Save, Eye, Code, Loader2, AlertCircle, FileText } from 'lucide-react'
import { cn } from '../aceternity'

interface ConfigEditorProps {
  isOpen: boolean
  onClose: () => void
  filename: string
  path: string
  category: string
  content: string
  isLoading?: boolean
  error?: string | null
  onSave: (content: string) => Promise<void>
  readOnly?: boolean
}

/**
 * ConfigEditor - Modal component for viewing and editing config files.
 *
 * Features:
 * - Large textarea with monospace font for code editing
 * - Markdown preview toggle (basic rendering)
 * - Save/Cancel buttons
 * - File path display
 * - Loading and error states
 * - Focus trap and keyboard shortcuts (Escape to close, Ctrl+S to save)
 */
export function ConfigEditor({
  isOpen,
  onClose,
  filename,
  path,
  category: _category,
  content: initialContent,
  isLoading = false,
  error = null,
  onSave,
  readOnly = false,
}: ConfigEditorProps) {
  // Note: category is received for potential future use (e.g., category-specific styling)
  void _category
  const [content, setContent] = useState(initialContent)
  const [showPreview, setShowPreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Sync content when initialContent changes
  useEffect(() => {
    setContent(initialContent)
    setHasChanges(false)
    setSaveError(null)
  }, [initialContent])

  // Track changes
  useEffect(() => {
    setHasChanges(content !== initialContent)
  }, [content, initialContent])

  // Focus management
  useEffect(() => {
    if (isOpen && !isLoading) {
      // Focus textarea for editing, or close button if read-only
      if (!readOnly && textareaRef.current) {
        textareaRef.current.focus()
      } else if (closeButtonRef.current) {
        closeButtonRef.current.focus()
      }
    }
  }, [isOpen, isLoading, readOnly])

  const handleClose = useCallback(() => {
    if (hasChanges && !readOnly) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close?')
      if (!confirmed) return
    }
    onClose()
  }, [hasChanges, readOnly, onClose])

  const handleSave = useCallback(async () => {
    if (readOnly || isSaving) return

    setIsSaving(true)
    setSaveError(null)

    try {
      await onSave(content)
      setHasChanges(false)
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save file')
    } finally {
      setIsSaving(false)
    }
  }, [readOnly, isSaving, onSave, content, onClose])

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape') {
        handleClose()
        return
      }

      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && !readOnly) {
        e.preventDefault()
        handleSave()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, readOnly, handleClose, handleSave])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={cn(
          'w-full max-w-6xl max-h-[95vh] min-h-[70vh] flex flex-col',
          'bg-[var(--color-bg-card)] border-2 border-[var(--color-border)]',
          'rounded-2xl shadow-2xl overflow-hidden',
          'animate-scale-in'
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="editor-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-[var(--color-border)] bg-gradient-to-r from-[var(--color-bg-secondary)] to-[var(--color-bg-tertiary)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-[var(--color-accent-primary)]/15 border border-[var(--color-accent-primary)]/30">
              <FileText size={18} className="text-[var(--color-accent-primary)]" />
            </div>
            <div className="min-w-0">
              <h2 id="editor-title" className="font-display text-lg font-semibold text-[var(--color-text-primary)] truncate">
                {readOnly ? 'View' : 'Edit'}: {filename}
              </h2>
              <p className="text-xs text-[var(--color-text-tertiary)] font-mono truncate">
                {path}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Preview toggle */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showPreview
                  ? 'bg-[var(--color-accent-primary)] text-white'
                  : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]'
              )}
              title={showPreview ? 'Show code' : 'Show preview'}
            >
              {showPreview ? <Code size={18} /> : <Eye size={18} />}
            </button>
            {/* Close button */}
            <button
              ref={closeButtonRef}
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors"
              aria-label="Close editor"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin text-[var(--color-accent-primary)]" size={32} />
              <span className="ml-3 text-[var(--color-text-secondary)]">Loading file...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="p-4 rounded-xl bg-[var(--color-error)]/10 border border-[var(--color-error)]/30">
                <div className="flex items-center gap-2 text-[var(--color-error)]">
                  <AlertCircle size={20} />
                  <span className="font-medium">Error loading file</span>
                </div>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{error}</p>
              </div>
            </div>
          ) : showPreview ? (
            <div className="h-full overflow-auto p-4 bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)]">
              <MarkdownPreview content={content} />
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              readOnly={readOnly}
              className={cn(
                'w-full h-full resize-none p-4 rounded-xl',
                'bg-[var(--color-bg-secondary)] border border-[var(--color-border)]',
                'text-[var(--color-text-primary)] font-mono text-sm leading-relaxed',
                'placeholder:text-[var(--color-text-muted)]',
                'focus:outline-none focus:border-[var(--color-accent-primary)] focus:ring-2 focus:ring-[var(--color-accent-primary)]/20',
                readOnly && 'cursor-default opacity-80'
              )}
              placeholder="File content..."
              spellCheck={false}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t-2 border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          <div className="flex items-center gap-2 text-sm">
            {hasChanges && !readOnly && (
              <span className="text-[var(--color-warning)] font-medium">
                Unsaved changes
              </span>
            )}
            {saveError && (
              <span className="text-[var(--color-error)]">
                {saveError}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg',
                'bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]',
                'text-[var(--color-text-secondary)]',
                'hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]',
                'transition-colors'
              )}
            >
              {readOnly ? 'Close' : 'Cancel'}
            </button>
            {!readOnly && (
              <button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg',
                  'bg-[var(--color-accent-primary)] text-white',
                  'hover:bg-[var(--color-accent-secondary)]',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-colors'
                )}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * MarkdownPreview - Basic markdown preview component.
 * Renders headings, paragraphs, code blocks, and lists.
 */
function MarkdownPreview({ content }: { content: string }) {
  // Very basic markdown rendering for preview purposes
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let inCodeBlock = false
  let codeBlockLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code block handling
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          <pre
            key={`code-${i}`}
            className="p-4 my-3 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] overflow-x-auto"
          >
            <code className="text-sm font-mono text-[var(--color-text-primary)]">
              {codeBlockLines.join('\n')}
            </code>
          </pre>
        )
        codeBlockLines = []
        inCodeBlock = false
      } else {
        // Start code block (language hint ignored for now)
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockLines.push(line)
      continue
    }

    // Headings
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-2xl font-display font-bold text-[var(--color-text-primary)] mt-6 mb-3">
          {line.slice(2)}
        </h1>
      )
      continue
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-xl font-display font-bold text-[var(--color-text-primary)] mt-5 mb-2">
          {line.slice(3)}
        </h2>
      )
      continue
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-lg font-display font-semibold text-[var(--color-text-primary)] mt-4 mb-2">
          {line.slice(4)}
        </h3>
      )
      continue
    }

    // List items
    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li key={i} className="ml-4 text-[var(--color-text-secondary)] list-disc">
          {line.slice(2)}
        </li>
      )
      continue
    }

    // Empty line
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />)
      continue
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-[var(--color-text-secondary)] mb-2">
        {formatInlineMarkdown(line)}
      </p>
    )
  }

  return <div className="prose prose-invert max-w-none">{elements}</div>
}

/**
 * Format inline markdown (bold, italic, code).
 */
function formatInlineMarkdown(text: string): React.ReactNode {
  // Split by inline code first
  const parts = text.split(/(`[^`]+`)/)

  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-accent-tertiary)] font-mono text-sm"
        >
          {part.slice(1, -1)}
        </code>
      )
    }

    // Handle bold (**text**)
    const boldParts = part.split(/(\*\*[^*]+\*\*)/)
    return boldParts.map((bp, j) => {
      if (bp.startsWith('**') && bp.endsWith('**')) {
        return (
          <strong key={`${i}-${j}`} className="font-semibold text-[var(--color-text-primary)]">
            {bp.slice(2, -2)}
          </strong>
        )
      }
      return bp
    })
  })
}
