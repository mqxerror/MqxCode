"use client"

import React from "react"
import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Plus,
  Settings,
  Moon,
  Sun,
  Zap,
  Terminal,
  Bug,
  MessageCircle,
  Home,
  Settings2,
  MonitorCog,
  FileText,
} from "lucide-react"
import { cn } from "./aceternity/cn"

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  projects?: Array<{ name: string; path: string }>
  selectedProject: string | null
  onSelectProject: (project: string | null) => void
  onNewProject?: () => void
  onOpenSettings?: () => void
  onToggleTheme?: () => void
  onToggleDebug?: () => void
  onToggleTerminal?: () => void
  onToggleAssistant?: () => void
  onOpenConfig?: () => void
  onOpenTasks?: () => void
  onOpenSpec?: () => void
  theme?: "dark" | "light"
  className?: string
}

export function Sidebar({
  isOpen,
  onToggle,
  projects = [],
  selectedProject,
  onSelectProject,
  onNewProject,
  onOpenSettings,
  onToggleTheme,
  onToggleDebug,
  onToggleTerminal,
  onToggleAssistant,
  onOpenConfig,
  onOpenTasks,
  onOpenSpec,
  theme = "dark",
  className,
}: SidebarProps) {
  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-200"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50",
          "bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)]",
          "flex flex-col transition-all duration-200",
          isOpen ? "w-[280px]" : "w-16",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          {isOpen && (
            <div className="flex items-center gap-2">
              <Zap size={24} className="text-[var(--color-accent-primary)]" />
              <span className="font-display font-bold text-lg">MqxCode</span>
            </div>
          )}

          <button
            onClick={onToggle}
            className="btn btn-ghost btn-icon p-2"
            title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin p-2">
          {/* Home */}
          <SidebarItem
            icon={<Home size={20} />}
            label="Home"
            isOpen={isOpen}
            isActive={!selectedProject}
            onClick={() => onSelectProject(null)}
          />

          {/* Projects Section */}
          <div className="mt-4">
            {isOpen && (
              <div className="flex items-center justify-between px-3 mb-2">
                <span className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  Projects
                </span>
                {onNewProject && (
                  <button
                    onClick={onNewProject}
                    className="btn btn-ghost btn-icon p-1"
                    title="New Project"
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>
            )}

            <div className="space-y-1">
              {projects.map((project) => (
                <SidebarItem
                  key={project.name}
                  icon={<FolderOpen size={20} />}
                  label={project.name}
                  isOpen={isOpen}
                  isActive={selectedProject === project.name}
                  onClick={() => onSelectProject(project.name)}
                />
              ))}

              {!isOpen && onNewProject && (
                <SidebarItem
                  icon={<Plus size={20} />}
                  label="New Project"
                  isOpen={isOpen}
                  onClick={onNewProject}
                />
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6">
            {isOpen && (
              <span className="px-3 text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                Quick Actions
              </span>
            )}

            <div className="mt-2 space-y-1">
              {onToggleDebug && (
                <SidebarItem
                  icon={<Bug size={20} />}
                  label="Debug Panel"
                  shortcut="D"
                  isOpen={isOpen}
                  onClick={onToggleDebug}
                />
              )}

              {onToggleTerminal && (
                <SidebarItem
                  icon={<Terminal size={20} />}
                  label="Terminal"
                  shortcut="T"
                  isOpen={isOpen}
                  onClick={onToggleTerminal}
                />
              )}

              {onToggleAssistant && (
                <SidebarItem
                  icon={<MessageCircle size={20} />}
                  label="Assistant"
                  shortcut="A"
                  isOpen={isOpen}
                  onClick={onToggleAssistant}
                />
              )}
            </div>
          </div>

          {/* Tools Section */}
          <div className="mt-6">
            {isOpen && (
              <span className="px-3 text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                Tools
              </span>
            )}

            <div className="mt-2 space-y-1">
              {onOpenSpec && (
                <SidebarItem
                  icon={<FileText size={20} />}
                  label="Spec Viewer"
                  isOpen={isOpen}
                  onClick={onOpenSpec}
                />
              )}

              {onOpenConfig && (
                <SidebarItem
                  icon={<Settings2 size={20} />}
                  label="Config Center"
                  isOpen={isOpen}
                  onClick={onOpenConfig}
                />
              )}

              {onOpenTasks && (
                <SidebarItem
                  icon={<MonitorCog size={20} />}
                  label="Server Tasks"
                  isOpen={isOpen}
                  onClick={onOpenTasks}
                />
              )}
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-[var(--color-border)]">
          {onToggleTheme && (
            <SidebarItem
              icon={theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              label={theme === "dark" ? "Light Mode" : "Dark Mode"}
              isOpen={isOpen}
              onClick={onToggleTheme}
            />
          )}

          {onOpenSettings && (
            <SidebarItem
              icon={<Settings size={20} />}
              label="Settings"
              shortcut=","
              isOpen={isOpen}
              onClick={onOpenSettings}
            />
          )}
        </div>
      </aside>
    </>
  )
}

interface SidebarItemProps {
  icon: React.ReactNode
  label: string
  shortcut?: string
  isOpen: boolean
  isActive?: boolean
  onClick?: () => void
}

function SidebarItem({
  icon,
  label,
  shortcut,
  isOpen,
  isActive,
  onClick,
}: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg",
        "text-left transition-colors duration-150",
        isActive
          ? "bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)]"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
      )}
      title={!isOpen ? label : undefined}
    >
      <span className="flex-shrink-0">{icon}</span>

      {isOpen && (
        <div className="flex-1 flex items-center justify-between overflow-hidden">
          <span className="text-sm font-medium truncate">{label}</span>
          {shortcut && (
            <kbd className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]">
              {shortcut}
            </kbd>
          )}
        </div>
      )}
    </button>
  )
}

export default Sidebar
