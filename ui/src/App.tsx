import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useProjects, useFeatures, useAgentStatus, useSettings } from './hooks/useProjects'
import { useProjectWebSocket } from './hooks/useWebSocket'
import { useFeatureSound } from './hooks/useFeatureSound'
import { useCelebration } from './hooks/useCelebration'
import { useTheme } from './contexts/ThemeContext'

const STORAGE_KEY = 'autocoder-selected-project'

// Core components - loaded immediately
import { ProjectSelector } from './components/ProjectSelector'
import { KanbanBoard } from './components/KanbanBoard'
import { AgentControl } from './components/AgentControl'
import { ProgressDashboard } from './components/ProgressDashboard'
import { AgentThought } from './components/AgentThought'
import { AssistantFAB } from './components/AssistantFAB'
import { DevServerControl } from './components/DevServerControl'
import { Loader2, Settings, Moon, Sun, Bug, Terminal, MessageCircle, FileText, Settings2, MonitorCog } from 'lucide-react'
import { PixelatedCanvas } from './components/aceternity/pixelated-canvas'
import type { Feature } from './lib/types'
import type { TabType } from './components/DebugLogViewer'

// Lazy loaded components - only loaded when needed
const SetupWizard = lazy(() => import('./components/SetupWizard').then(m => ({ default: m.SetupWizard })))
const AddFeatureForm = lazy(() => import('./components/AddFeatureForm').then(m => ({ default: m.AddFeatureForm })))
const FeatureModal = lazy(() => import('./components/FeatureModal').then(m => ({ default: m.FeatureModal })))
const DebugLogViewer = lazy(() => import('./components/DebugLogViewer').then(m => ({ default: m.DebugLogViewer })))
const AssistantPanel = lazy(() => import('./components/AssistantPanel').then(m => ({ default: m.AssistantPanel })))
const ExpandProjectModal = lazy(() => import('./components/ExpandProjectModal').then(m => ({ default: m.ExpandProjectModal })))
const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })))
const SlidePanel = lazy(() => import('./components/SlidePanel').then(m => ({ default: m.SlidePanel })))
const SpecViewer = lazy(() => import('./components/spec-viewer').then(m => ({ default: m.SpecViewer })))
const CommandCenter = lazy(() => import('./components/command-center').then(m => ({ default: m.CommandCenter })))
const ServerTasks = lazy(() => import('./components/command-center').then(m => ({ default: m.ServerTasks })))
const CreativeSidebar = lazy(() => import('./components/CreativeSidebar').then(m => ({ default: m.CreativeSidebar })))

// Loading fallback for lazy components
function LoadingFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Loader2 className="animate-spin text-[var(--color-accent-primary)]" size={32} />
    </div>
  )
}

function App() {
  // Initialize selected project from localStorage
  const [selectedProject, setSelectedProject] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
  })
  const [showAddFeature, setShowAddFeature] = useState(false)
  const [showExpandProject, setShowExpandProject] = useState(false)
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null)
  const [setupComplete, setSetupComplete] = useState(true) // Start optimistic
  const [debugOpen, setDebugOpen] = useState(false)
  const [debugPanelHeight, setDebugPanelHeight] = useState(288) // Default height
  const [debugActiveTab, setDebugActiveTab] = useState<TabType>('agent')
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isSpecCreating, setIsSpecCreating] = useState(false)

  // Sidebar panel states
  const [showSpecPanel, setShowSpecPanel] = useState(false)
  const [showConfigPanel, setShowConfigPanel] = useState(false)
  const [showTasksPanel, setShowTasksPanel] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return localStorage.getItem('sidebar-open') !== 'false'
    } catch {
      return true
    }
  })

  const queryClient = useQueryClient()
  const { theme, toggleTheme } = useTheme()
  const { data: projects, isLoading: projectsLoading } = useProjects()
  const { data: features } = useFeatures(selectedProject)
  const { data: settings } = useSettings()
  useAgentStatus(selectedProject) // Keep polling for status updates
  const wsState = useProjectWebSocket(selectedProject)

  // Play sounds when features move between columns
  useFeatureSound(features)

  // Celebrate when all features are complete
  useCelebration(features, selectedProject)

  // Toggle sidebar and persist state
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => {
      const newState = !prev
      try {
        localStorage.setItem('sidebar-open', String(newState))
      } catch {
        // localStorage not available
      }
      return newState
    })
  }, [])

  // Persist selected project to localStorage
  const handleSelectProject = useCallback((project: string | null) => {
    setSelectedProject(project)
    try {
      if (project) {
        localStorage.setItem(STORAGE_KEY, project)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // localStorage not available
    }
  }, [])

  // Validate stored project exists (clear if project was deleted)
  useEffect(() => {
    if (selectedProject && projects && !projects.some(p => p.name === selectedProject)) {
      handleSelectProject(null)
    }
  }, [selectedProject, projects, handleSelectProject])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // D : Toggle debug window
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        setDebugOpen(prev => !prev)
      }

      // T : Toggle terminal tab in debug panel
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        if (!debugOpen) {
          // If panel is closed, open it and switch to terminal tab
          setDebugOpen(true)
          setDebugActiveTab('terminal')
        } else if (debugActiveTab === 'terminal') {
          // If already on terminal tab, close the panel
          setDebugOpen(false)
        } else {
          // If open but on different tab, switch to terminal
          setDebugActiveTab('terminal')
        }
      }

      // N : Add new feature (when project selected)
      if ((e.key === 'n' || e.key === 'N') && selectedProject) {
        e.preventDefault()
        setShowAddFeature(true)
      }

      // E : Expand project with AI (when project selected and has features)
      if ((e.key === 'e' || e.key === 'E') && selectedProject && features &&
          (features.pending.length + features.in_progress.length + features.done.length) > 0) {
        e.preventDefault()
        setShowExpandProject(true)
      }

      // A : Toggle assistant panel (when project selected and not in spec creation)
      if ((e.key === 'a' || e.key === 'A') && selectedProject && !isSpecCreating) {
        e.preventDefault()
        setAssistantOpen(prev => !prev)
      }

      // , : Open settings
      if (e.key === ',') {
        e.preventDefault()
        setShowSettings(true)
      }

      // Escape : Close modals
      if (e.key === 'Escape') {
        if (showExpandProject) {
          setShowExpandProject(false)
        } else if (showSettings) {
          setShowSettings(false)
        } else if (assistantOpen) {
          setAssistantOpen(false)
        } else if (showAddFeature) {
          setShowAddFeature(false)
        } else if (selectedFeature) {
          setSelectedFeature(null)
        } else if (debugOpen) {
          setDebugOpen(false)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedProject, showAddFeature, showExpandProject, selectedFeature, debugOpen, debugActiveTab, assistantOpen, features, showSettings, isSpecCreating])

  // Combine WebSocket progress with feature data
  const progress = wsState.progress.total > 0 ? wsState.progress : {
    passing: features?.done.length ?? 0,
    total: (features?.pending.length ?? 0) + (features?.in_progress.length ?? 0) + (features?.done.length ?? 0),
    percentage: 0,
  }

  if (progress.total > 0 && progress.percentage === 0) {
    progress.percentage = Math.round((progress.passing / progress.total) * 100 * 10) / 10
  }

  if (!setupComplete) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <SetupWizard onComplete={() => setSetupComplete(true)} />
      </Suspense>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Creative Sidebar */}
      {selectedProject && (
        <Suspense fallback={null}>
          <CreativeSidebar
            isOpen={sidebarOpen}
            onToggle={handleSidebarToggle}
            features={features}
            agentStatus={wsState.agentStatus}
            progress={progress}
            onOpenSpec={() => setShowSpecPanel(true)}
            onOpenConfig={() => setShowConfigPanel(true)}
            onOpenTasks={() => setShowTasksPanel(true)}
            onFeatureClick={setSelectedFeature}
          />
        </Suspense>
      )}

      {/* Main content wrapper with sidebar offset */}
      <div
        className="transition-all duration-300"
        style={{ marginLeft: selectedProject ? (sidebarOpen ? 280 : 64) : 0 }}
      >
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--color-bg-primary)] border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <div className="rounded-lg overflow-hidden bg-black">
                <PixelatedCanvas
                  src="/images/mqx-logo.jpg"
                  width={48}
                  height={48}
                  pixelSize={4}
                  grayscale={true}
                  animateOnHover={true}
                  distortionRadius={30}
                  distortionStrength={8}
                />
              </div>
              <h1 className="font-display text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
                MqxCode
              </h1>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <ProjectSelector
                projects={projects ?? []}
                selectedProject={selectedProject}
                onSelectProject={handleSelectProject}
                isLoading={projectsLoading}
                onSpecCreatingChange={setIsSpecCreating}
              />

              {selectedProject && (
                <>
                  <AgentControl
                    projectName={selectedProject}
                    status={wsState.agentStatus}
                  />

                  <DevServerControl
                    projectName={selectedProject}
                    status={wsState.devServerStatus}
                    url={wsState.devServerUrl}
                  />

                  {/* GLM Mode Badge */}
                  {settings?.glm_mode && (
                    <span className="badge badge-primary" title="Using GLM API (configured via .env)">
                      GLM
                    </span>
                  )}

                  {/* Quick action buttons */}
                  <div className="hidden md:flex items-center gap-1">
                    <button
                      onClick={() => setDebugOpen(!debugOpen)}
                      className="btn btn-ghost btn-icon"
                      title="Debug (D)"
                    >
                      <Bug size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setDebugOpen(true)
                        setDebugActiveTab('terminal')
                      }}
                      className="btn btn-ghost btn-icon"
                      title="Terminal (T)"
                    >
                      <Terminal size={18} />
                    </button>
                    <button
                      onClick={() => setAssistantOpen(!assistantOpen)}
                      className="btn btn-ghost btn-icon"
                      title="Assistant (A)"
                    >
                      <MessageCircle size={18} />
                    </button>

                    {/* Divider */}
                    <div className="w-px h-5 bg-[var(--color-border)] mx-1" />

                    {/* Tools buttons */}
                    <button
                      onClick={() => setShowSpecPanel(true)}
                      className="btn btn-ghost btn-icon"
                      title="Spec Viewer"
                    >
                      <FileText size={18} />
                    </button>
                    <button
                      onClick={() => setShowConfigPanel(true)}
                      className="btn btn-ghost btn-icon"
                      title="Config Center"
                    >
                      <Settings2 size={18} />
                    </button>
                    <button
                      onClick={() => setShowTasksPanel(true)}
                      className="btn btn-ghost btn-icon"
                      title="Server Tasks"
                    >
                      <MonitorCog size={18} />
                    </button>

                    {/* Divider */}
                    <div className="w-px h-5 bg-[var(--color-border)] mx-1" />

                    <button
                      onClick={() => setShowSettings(true)}
                      className="btn btn-ghost btn-icon"
                      title="Settings (,)"
                    >
                      <Settings size={18} />
                    </button>
                    <button
                      onClick={toggleTheme}
                      className="btn btn-ghost btn-icon"
                      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                  </div>

                  {/* Mobile buttons */}
                  <div className="flex md:hidden items-center gap-2">
                    <button
                      onClick={() => setShowSettings(true)}
                      className="btn btn-ghost btn-icon"
                      title="Settings (,)"
                    >
                      <Settings size={18} />
                    </button>
                    <button
                      onClick={toggleTheme}
                      className="btn btn-ghost btn-icon"
                      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                  </div>
                </>
              )}

              {/* Theme toggle when no project selected */}
              {!selectedProject && (
                <button
                  onClick={toggleTheme}
                  className="btn btn-ghost btn-icon"
                  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className="max-w-7xl mx-auto px-4 py-8"
        style={{ paddingBottom: debugOpen ? debugPanelHeight + 32 : undefined }}
      >
        {!selectedProject ? (
          <div className="mt-12">
            <div className="empty-state py-16">
              <div className="mb-8 flex justify-center">
                <div className="rounded-2xl overflow-hidden bg-black shadow-lg">
                  <PixelatedCanvas
                    src="/images/mqx-logo.jpg"
                    width={200}
                    height={200}
                    pixelSize={6}
                    grayscale={true}
                    animateOnHover={true}
                    distortionRadius={80}
                    distortionStrength={12}
                  />
                </div>
              </div>
              <h2 className="font-display text-3xl font-bold mb-3 text-[var(--color-text-primary)]">
                Welcome to MqxCode
              </h2>
              <p className="text-[var(--color-text-secondary)] mb-4 text-lg">
                Select a project from the dropdown above or create a new one to get started.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Progress Dashboard */}
            <ProgressDashboard
              passing={progress.passing}
              total={progress.total}
              percentage={progress.percentage}
              isConnected={wsState.isConnected}
            />

            {/* Agent Thought - shows latest agent narrative */}
            <AgentThought
              logs={wsState.logs}
              agentStatus={wsState.agentStatus}
            />

            {/* Initializing Features State - show when agent is running but no features yet */}
            {features &&
             features.pending.length === 0 &&
             features.in_progress.length === 0 &&
             features.done.length === 0 &&
             wsState.agentStatus === 'running' && (
              <div className="card p-8 text-center animate-fade-in-up">
                <Loader2 size={32} className="animate-spin mx-auto mb-4 text-[var(--color-accent-primary)]" />
                <h3 className="font-display font-bold text-xl mb-2">
                  Initializing Features...
                </h3>
                <p className="text-[var(--color-text-secondary)]">
                  The agent is reading your spec and creating features. This may take a moment.
                </p>
              </div>
            )}

            {/* Kanban Board */}
            <KanbanBoard
              features={features}
              onFeatureClick={setSelectedFeature}
              onAddFeature={() => setShowAddFeature(true)}
              onExpandProject={() => setShowExpandProject(true)}
            />
          </div>
        )}
      </main>

      {/* Lazy loaded modals wrapped in Suspense */}
      <Suspense fallback={<LoadingFallback />}>
        {/* Add Feature Modal */}
        {showAddFeature && selectedProject && (
          <AddFeatureForm
            projectName={selectedProject}
            onClose={() => setShowAddFeature(false)}
          />
        )}

        {/* Feature Detail Modal */}
        {selectedFeature && selectedProject && (
          <FeatureModal
            feature={selectedFeature}
            projectName={selectedProject}
            onClose={() => setSelectedFeature(null)}
          />
        )}

        {/* Expand Project Modal - AI-powered bulk feature creation */}
        {showExpandProject && selectedProject && (
          <ExpandProjectModal
            isOpen={showExpandProject}
            projectName={selectedProject}
            onClose={() => setShowExpandProject(false)}
            onFeaturesAdded={() => {
              // Invalidate features query to refresh the kanban board
              queryClient.invalidateQueries({ queryKey: ['features', selectedProject] })
            }}
          />
        )}

        {/* Settings Modal */}
        {showSettings && (
          <SettingsModal onClose={() => setShowSettings(false)} />
        )}

        {/* Spec Viewer Panel */}
        {showSpecPanel && selectedProject && (
          <SlidePanel
            isOpen={showSpecPanel}
            onClose={() => setShowSpecPanel(false)}
            title="Spec Viewer"
            icon={<FileText size={18} className="text-[var(--color-accent-primary)]" />}
            width="2xl"
          >
            <SpecViewer projectName={selectedProject} className="h-full" />
          </SlidePanel>
        )}

        {/* Config Center Panel */}
        {showConfigPanel && (
          <SlidePanel
            isOpen={showConfigPanel}
            onClose={() => setShowConfigPanel(false)}
            title="Config Center"
            icon={<Settings2 size={18} className="text-[var(--color-accent-primary)]" />}
            width="2xl"
          >
            <CommandCenter />
          </SlidePanel>
        )}

        {/* Server Tasks Panel */}
        {showTasksPanel && selectedProject && (
          <SlidePanel
            isOpen={showTasksPanel}
            onClose={() => setShowTasksPanel(false)}
            title="Server Tasks"
            icon={<MonitorCog size={18} className="text-[var(--color-accent-primary)]" />}
            width="xl"
          >
            <div className="p-4">
              <ServerTasks projectName={selectedProject} />
            </div>
          </SlidePanel>
        )}
      </Suspense>
      </div> {/* End main content wrapper */}

      {/* Debug Log Viewer - fixed to bottom */}
      {selectedProject && (
        <Suspense fallback={null}>
          <DebugLogViewer
            logs={wsState.logs}
            parsedLogs={wsState.parsedLogs}
            devLogs={wsState.devLogs}
            parsedDevLogs={wsState.parsedDevLogs}
            agentContext={wsState.agentContext}
            agentStatus={wsState.agentStatus}
            isOpen={debugOpen}
            onToggle={() => setDebugOpen(!debugOpen)}
            onClear={wsState.clearLogs}
            onClearDevLogs={wsState.clearDevLogs}
            onHeightChange={setDebugPanelHeight}
            projectName={selectedProject}
            activeTab={debugActiveTab}
            onTabChange={setDebugActiveTab}
            sidebarWidth={sidebarOpen ? 280 : 64}
          />
        </Suspense>
      )}

      {/* Assistant FAB and Panel - hide when expand modal or spec creation is open */}
      {selectedProject && !showExpandProject && !isSpecCreating && (
        <>
          <AssistantFAB
            onClick={() => setAssistantOpen(!assistantOpen)}
            isOpen={assistantOpen}
          />
          <Suspense fallback={null}>
            <AssistantPanel
              projectName={selectedProject}
              isOpen={assistantOpen}
              onClose={() => setAssistantOpen(false)}
            />
          </Suspense>
        </>
      )}
    </div>
  )
}

export default App
