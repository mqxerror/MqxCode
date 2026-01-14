import { useState } from 'react'
import { ChevronDown, Plus, FolderOpen, Loader2, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ProjectSummary } from '../lib/types'
import { NewProjectModal } from './NewProjectModal'
import { ConfirmDialog } from './ConfirmDialog'
import { useDeleteProject } from '../hooks/useProjects'

interface ProjectSelectorProps {
  projects: ProjectSummary[]
  selectedProject: string | null
  onSelectProject: (name: string | null) => void
  isLoading: boolean
  onSpecCreatingChange?: (isCreating: boolean) => void
}

export function ProjectSelector({
  projects,
  selectedProject,
  onSelectProject,
  isLoading,
  onSpecCreatingChange,
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null)

  const deleteProject = useDeleteProject()

  const handleProjectCreated = (projectName: string) => {
    onSelectProject(projectName)
    setIsOpen(false)
  }

  const handleDeleteClick = (e: React.MouseEvent, projectName: string) => {
    // Prevent the click from selecting the project
    e.stopPropagation()
    setProjectToDelete(projectName)
  }

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return

    try {
      await deleteProject.mutateAsync(projectToDelete)
      // If the deleted project was selected, clear the selection
      if (selectedProject === projectToDelete) {
        onSelectProject(null)
      }
      setProjectToDelete(null)
    } catch (error) {
      // Error is handled by the mutation, just close the dialog
      console.error('Failed to delete project:', error)
      setProjectToDelete(null)
    }
  }

  const handleCancelDelete = () => {
    setProjectToDelete(null)
  }

  const selectedProjectData = projects.find(p => p.name === selectedProject)

  return (
    <div className="relative">
      {/* Dropdown Trigger */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center justify-between gap-3
          min-w-[220px] px-4 py-2.5
          bg-[var(--color-bg-secondary)]
          border border-[var(--color-border)]
          rounded-xl
          text-[var(--color-text-primary)]
          hover:border-[var(--color-accent-primary)]/50
          transition-all
        "
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 size={18} className="animate-spin text-[var(--color-accent-primary)]" />
        ) : selectedProject ? (
          <>
            <span className="flex items-center gap-2 truncate">
              <FolderOpen size={18} className="text-[var(--color-accent-primary)]" />
              <span className="truncate font-medium">{selectedProject}</span>
            </span>
            {selectedProjectData && selectedProjectData.stats.total > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--color-success)]/20 text-[var(--color-success)]">
                {selectedProjectData.stats.percentage}%
              </span>
            )}
          </>
        ) : (
          <span className="text-[var(--color-text-tertiary)]">
            Select Project
          </span>
        )}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={18} className="text-[var(--color-text-tertiary)]" />
        </motion.div>
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-2 w-full z-50 min-w-[300px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden"
            >
              {projects.length > 0 ? (
                <div className="max-h-[300px] overflow-auto scrollbar-thin">
                  {projects.map((project, index) => (
                    <motion.div
                      key={project.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={`flex items-center border-b border-[var(--color-border)] last:border-b-0 ${
                        project.name === selectedProject
                          ? 'bg-[var(--color-accent-primary)]/10'
                          : 'hover:bg-[var(--color-bg-secondary)]'
                      }`}
                    >
                      <button
                        onClick={() => {
                          onSelectProject(project.name)
                          setIsOpen(false)
                        }}
                        className="flex-1 flex items-center justify-between px-4 py-3 transition-colors"
                      >
                        <span className="flex items-center gap-3">
                          <FolderOpen size={16} className={project.name === selectedProject ? 'text-[var(--color-accent-primary)]' : 'text-[var(--color-text-tertiary)]'} />
                          <span className={`text-sm font-medium ${project.name === selectedProject ? 'text-[var(--color-accent-primary)]' : 'text-[var(--color-text-primary)]'}`}>
                            {project.name}
                          </span>
                        </span>
                        {project.stats.total > 0 && (
                          <span className="text-xs font-mono text-[var(--color-text-tertiary)]">
                            {project.stats.passing}/{project.stats.total}
                          </span>
                        )}
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => handleDeleteClick(e, project.name)}
                        className="p-2 mr-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors rounded-lg"
                        title={`Delete ${project.name}`}
                      >
                        <Trash2 size={16} />
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-[var(--color-text-tertiary)]">
                  <FolderOpen size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No projects yet</p>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-[var(--color-border)]" />

              {/* Create New */}
              <motion.button
                whileHover={{ backgroundColor: 'var(--color-bg-secondary)' }}
                onClick={() => {
                  setShowNewProjectModal(true)
                  setIsOpen(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-[var(--color-accent-primary)] font-medium text-sm transition-colors"
              >
                <Plus size={18} />
                New Project
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onProjectCreated={handleProjectCreated}
        onStepChange={(step) => onSpecCreatingChange?.(step === 'chat')}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={projectToDelete !== null}
        title="Delete Project"
        message={`Are you sure you want to remove "${projectToDelete}" from the registry? This will unregister the project but preserve its files on disk.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={deleteProject.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  )
}
