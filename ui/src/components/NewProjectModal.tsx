/**
 * New Project Modal Component
 *
 * Multi-step modal for creating new projects with creative animations:
 * 1. Enter project name
 * 2. Select project folder
 * 3. Choose spec method (Claude or manual)
 * 4a. If Claude: Show SpecCreationChat
 * 4b. If manual: Create project and close
 */

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, FileEdit, ArrowRight, ArrowLeft, Loader2, CheckCircle2, Folder, Sparkles, Rocket, Code2, Wand2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCreateProject } from '../hooks/useProjects'
import { SpecCreationChat } from './SpecCreationChat'
import { FolderBrowser } from './FolderBrowser'
import { startAgent } from '../lib/api'

type InitializerStatus = 'idle' | 'starting' | 'error'

type Step = 'name' | 'folder' | 'method' | 'chat' | 'complete'
type SpecMethod = 'claude' | 'manual'

interface NewProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onProjectCreated: (projectName: string) => void
  onStepChange?: (step: Step) => void
}

export function NewProjectModal({
  isOpen,
  onClose,
  onProjectCreated,
  onStepChange,
}: NewProjectModalProps) {
  const [step, setStep] = useState<Step>('name')
  const [projectName, setProjectName] = useState('')
  const [projectPath, setProjectPath] = useState<string | null>(null)
  const [_specMethod, setSpecMethod] = useState<SpecMethod | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [initializerStatus, setInitializerStatus] = useState<InitializerStatus>('idle')
  const [initializerError, setInitializerError] = useState<string | null>(null)
  const [yoloModeSelected, setYoloModeSelected] = useState(false)

  // Suppress unused variable warning - specMethod may be used in future
  void _specMethod

  const createProject = useCreateProject()

  // Wrapper to notify parent of step changes
  const changeStep = (newStep: Step) => {
    setStep(newStep)
    onStepChange?.(newStep)
  }

  if (!isOpen) return null

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = projectName.trim()

    if (!trimmed) {
      setError('Please enter a project name')
      return
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      setError('Project name can only contain letters, numbers, hyphens, and underscores')
      return
    }

    setError(null)
    changeStep('folder')
  }

  const handleFolderSelect = (path: string) => {
    setProjectPath(path)  // Use selected path directly - no subfolder creation
    changeStep('method')
  }

  const handleFolderCancel = () => {
    changeStep('name')
  }

  const handleMethodSelect = async (method: SpecMethod) => {
    setSpecMethod(method)

    if (!projectPath) {
      setError('Please select a project folder first')
      changeStep('folder')
      return
    }

    if (method === 'manual') {
      // Create project immediately with manual method
      try {
        const project = await createProject.mutateAsync({
          name: projectName.trim(),
          path: projectPath,
          specMethod: 'manual',
        })
        changeStep('complete')
        setTimeout(() => {
          onProjectCreated(project.name)
          handleClose()
        }, 1500)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to create project')
      }
    } else {
      // Create project then show chat
      try {
        await createProject.mutateAsync({
          name: projectName.trim(),
          path: projectPath,
          specMethod: 'claude',
        })
        changeStep('chat')
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to create project')
      }
    }
  }

  const handleSpecComplete = async (_specPath: string, yoloMode: boolean = false) => {
    // Save yoloMode for retry
    setYoloModeSelected(yoloMode)
    // Auto-start the initializer agent
    setInitializerStatus('starting')
    try {
      await startAgent(projectName.trim(), yoloMode)
      // Success - navigate to project
      changeStep('complete')
      setTimeout(() => {
        onProjectCreated(projectName.trim())
        handleClose()
      }, 1500)
    } catch (err) {
      setInitializerStatus('error')
      setInitializerError(err instanceof Error ? err.message : 'Failed to start agent')
    }
  }

  const handleRetryInitializer = () => {
    setInitializerError(null)
    setInitializerStatus('idle')
    handleSpecComplete('', yoloModeSelected)
  }

  const handleChatCancel = () => {
    // Go back to method selection but keep the project
    changeStep('method')
    setSpecMethod(null)
  }

  const handleExitToProject = () => {
    // Exit chat and go directly to project - user can start agent manually
    onProjectCreated(projectName.trim())
    handleClose()
  }

  const handleClose = () => {
    changeStep('name')
    setProjectName('')
    setProjectPath(null)
    setSpecMethod(null)
    setError(null)
    setInitializerStatus('idle')
    setInitializerError(null)
    setYoloModeSelected(false)
    onClose()
  }

  const handleBack = () => {
    if (step === 'method') {
      changeStep('folder')
      setSpecMethod(null)
    } else if (step === 'folder') {
      changeStep('name')
      setProjectPath(null)
    }
  }

  // Step indicators - defined early for use in all step renders
  const steps = ['name', 'folder', 'method'] as const
  const currentStepIndex = steps.indexOf(step as typeof steps[number])

  // Full-screen chat view
  if (step === 'chat') {
    return createPortal(
      <div className="fixed inset-0 z-50 bg-[var(--color-bg-primary)]">
        <SpecCreationChat
          projectName={projectName.trim()}
          onComplete={handleSpecComplete}
          onCancel={handleChatCancel}
          onExitToProject={handleExitToProject}
          initializerStatus={initializerStatus}
          initializerError={initializerError}
          onRetryInitializer={handleRetryInitializer}
        />
      </div>,
      document.body
    )
  }

  // Folder step uses larger modal with consistent step progress
  if (step === 'folder') {
    const folderStepIndex = 1 // folder is step 2 (index 1)
    return createPortal(
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-3xl max-h-[85vh] flex flex-col bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with gradient - consistent with other steps */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 via-neutral-900 to-black" />
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-0 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
            </div>

            <div className="relative p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  initial={{ rotate: -10, scale: 0.8 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="p-3 rounded-xl bg-white/10 backdrop-blur-sm"
                >
                  <Folder size={24} className="text-white" />
                </motion.div>
                <div>
                  <h2 className="font-display font-bold text-xl text-white">
                    Select Project Location
                  </h2>
                  <p className="text-sm text-white/60">
                    Choose a folder for <span className="font-mono font-semibold text-white/80">{projectName}</span>
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X size={20} />
              </motion.button>
            </div>

            {/* Step Progress - consistent with other steps */}
            <div className="relative px-5 pb-4">
              <div className="flex items-center gap-2">
                {steps.map((s, i) => (
                  <div key={s} className="flex-1 flex items-center">
                    <motion.div
                      initial={false}
                      animate={{
                        backgroundColor: i <= folderStepIndex ? 'rgb(255,255,255)' : 'rgba(255,255,255,0.2)',
                      }}
                      className="h-1 flex-1 rounded-full"
                    />
                    {i < steps.length - 1 && <div className="w-2" />}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-white/40">Name</span>
                <span className="text-xs text-white/80 font-semibold">Location</span>
                <span className="text-xs text-white/40">Method</span>
              </div>
            </div>
          </div>

          {/* Folder Browser */}
          <div className="flex-1 overflow-hidden">
            <FolderBrowser
              onSelect={handleFolderSelect}
              onCancel={handleFolderCancel}
            />
          </div>

          {/* Back button footer */}
          <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleFolderCancel}
              className="flex items-center gap-2 px-4 py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <ArrowLeft size={18} />
              Back to Project Name
            </motion.button>
          </div>
        </motion.div>
      </motion.div>,
      document.body
    )
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={handleClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 via-neutral-900 to-black" />
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
          </div>

          <div className="relative p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="p-3 rounded-xl bg-white/10 backdrop-blur-sm"
              >
                {step === 'complete' ? (
                  <CheckCircle2 size={28} className="text-white" />
                ) : (
                  <Rocket size={28} className="text-white" />
                )}
              </motion.div>
              <div>
                <h2 className="font-display font-bold text-xl text-white">
                  {step === 'name' && 'Create New Project'}
                  {step === 'method' && 'Choose Setup Method'}
                  {step === 'complete' && 'Project Created!'}
                </h2>
                {step !== 'complete' && (
                  <p className="text-sm text-white/60">
                    {step === 'name' && 'Give your project a unique name'}
                    {step === 'method' && 'How would you like to define your app?'}
                  </p>
                )}
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X size={20} />
            </motion.button>
          </div>

          {/* Step Progress */}
          {step !== 'complete' && (
            <div className="relative px-6 pb-4">
              <div className="flex items-center gap-2">
                {steps.map((s, i) => (
                  <div key={s} className="flex-1 flex items-center">
                    <motion.div
                      initial={false}
                      animate={{
                        backgroundColor: i <= currentStepIndex ? 'rgb(255,255,255)' : 'rgba(255,255,255,0.2)',
                      }}
                      className="h-1 flex-1 rounded-full"
                    />
                    {i < steps.length - 1 && <div className="w-2" />}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-white/40">Name</span>
                <span className="text-xs text-white/40">Location</span>
                <span className="text-xs text-white/40">Method</span>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Project Name */}
            {step === 'name' && (
              <motion.form
                key="name"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleNameSubmit}
              >
                <div className="mb-6">
                  <label className="block font-semibold mb-3 text-[var(--color-text-primary)]">
                    Project Name
                  </label>
                  <div className="relative">
                    <Code2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="my-awesome-app"
                      className="w-full pl-12 pr-4 py-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent transition-all"
                      pattern="^[a-zA-Z0-9_\\-]+$"
                      autoFocus
                    />
                  </div>
                  <p className="text-sm text-[var(--color-text-tertiary)] mt-2 flex items-center gap-2">
                    <Sparkles size={14} />
                    Use letters, numbers, hyphens, and underscores only.
                  </p>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex justify-end">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50"
                    disabled={!projectName.trim()}
                  >
                    Continue
                    <ArrowRight size={18} />
                  </motion.button>
                </div>
              </motion.form>
            )}

            {/* Step 2: Spec Method */}
            {step === 'method' && (
              <motion.div
                key="method"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="space-y-4 mb-6">
                  {/* Claude option */}
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleMethodSelect('claude')}
                    disabled={createProject.isPending}
                    className="w-full text-left p-5 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl hover:border-white/30 transition-all disabled:opacity-50 group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-white text-black group-hover:scale-110 transition-transform">
                        <Wand2 size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-bold text-lg text-[var(--color-text-primary)]">Create with AI</span>
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-white/20 text-white">
                            Recommended
                          </span>
                        </div>
                        <p className="text-sm text-[var(--color-text-tertiary)]">
                          Interactive conversation to define features and generate your app specification automatically.
                        </p>
                      </div>
                      <ArrowRight size={20} className="text-[var(--color-text-tertiary)] group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.button>

                  {/* Manual option */}
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleMethodSelect('manual')}
                    disabled={createProject.isPending}
                    className="w-full text-left p-5 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl hover:border-white/30 transition-all disabled:opacity-50 group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] group-hover:scale-110 transition-transform">
                        <FileEdit size={24} />
                      </div>
                      <div className="flex-1">
                        <span className="font-bold text-lg text-[var(--color-text-primary)]">Edit Templates Manually</span>
                        <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
                          Edit the template files directly. Best for developers who want full control.
                        </p>
                      </div>
                      <ArrowRight size={20} className="text-[var(--color-text-tertiary)] group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.button>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {createProject.isPending && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-3 py-4 text-[var(--color-text-secondary)]"
                  >
                    <Loader2 size={20} className="animate-spin" />
                    <span>Creating project...</span>
                  </motion.div>
                )}

                <div className="flex justify-start mt-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleBack}
                    className="flex items-center gap-2 px-4 py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    disabled={createProject.isPending}
                  >
                    <ArrowLeft size={18} />
                    Back
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Complete */}
            {step === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className="inline-flex items-center justify-center w-20 h-20 bg-white text-black rounded-2xl mb-6"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <CheckCircle2 size={40} />
                  </motion.div>
                </motion.div>
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="font-display font-bold text-2xl mb-2 text-[var(--color-text-primary)]"
                >
                  {projectName}
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-[var(--color-text-secondary)]"
                >
                  Your project has been created successfully!
                </motion.p>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-6 flex items-center justify-center gap-2 text-[var(--color-text-tertiary)]"
                >
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Redirecting...</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
