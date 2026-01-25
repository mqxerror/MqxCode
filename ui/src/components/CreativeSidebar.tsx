/**
 * Creative Sidebar Component
 *
 * A visually stunning sidebar with:
 * - Animated circular progress indicator
 * - Feature overview cards
 * - Quick access tools
 * - Beautiful gradients and animations
 */

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Settings2,
  MonitorCog,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  Brain,
  Sparkles,
  Activity,
  BarChart3,
} from 'lucide-react'
import { cn } from './aceternity/cn'
import type { Feature, AgentStatus } from '../lib/types'

interface CreativeSidebarProps {
  isOpen: boolean
  onToggle: () => void
  features?: {
    pending: Feature[]
    in_progress: Feature[]
    done: Feature[]
  }
  agentStatus?: AgentStatus
  progress: {
    passing: number
    total: number
    percentage: number
  }
  onOpenSpec?: () => void
  onOpenConfig?: () => void
  onOpenTasks?: () => void
  onFeatureClick?: (feature: Feature) => void
  className?: string
}

/**
 * Animated circular progress ring
 */
function ProgressRing({
  percentage,
  size = 120,
  strokeWidth = 8,
  agentStatus,
}: {
  percentage: number
  size?: number
  strokeWidth?: number
  agentStatus?: AgentStatus
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  const statusColor = useMemo(() => {
    switch (agentStatus) {
      case 'running':
        return 'var(--color-accent-primary)'
      case 'paused':
        return 'var(--color-warning)'
      case 'crashed':
        return 'var(--color-danger)'
      default:
        return 'var(--color-success)'
    }
  }, [agentStatus])

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Background ring */}
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-bg-tertiary)"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={statusColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{
            filter: `drop-shadow(0 0 8px ${statusColor})`,
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={percentage}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-2xl font-display font-bold text-[var(--color-text-primary)]"
        >
          {Math.round(percentage)}%
        </motion.span>
        <span className="text-xs text-[var(--color-text-tertiary)]">Complete</span>
      </div>

      {/* Animated glow effect when running */}
      {agentStatus === 'running' && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${statusColor}20 0%, transparent 70%)`,
          }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </div>
  )
}

/**
 * Feature stat card
 */
function StatCard({
  label,
  count,
  icon: Icon,
  color,
  gradient,
  onClick,
}: {
  label: string
  count: number
  icon: typeof CheckCircle2
  color: string
  gradient: string
  onClick?: () => void
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'relative w-full p-3 rounded-xl overflow-hidden',
        'border-2 border-[var(--color-border)]',
        'transition-all duration-200',
        'hover:border-transparent hover:shadow-lg',
        'group text-left'
      )}
    >
      {/* Gradient background on hover */}
      <div
        className={cn(
          'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity',
          gradient
        )}
      />

      <div className="relative flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', `bg-${color}/15`)}>
          <Icon size={18} className={`text-${color}`} style={{ color }} />
        </div>
        <div>
          <span className="text-2xl font-display font-bold text-[var(--color-text-primary)]">
            {count}
          </span>
          <p className="text-xs text-[var(--color-text-tertiary)]">{label}</p>
        </div>
      </div>
    </motion.button>
  )
}

/**
 * Quick action button
 */
function QuickAction({
  icon: Icon,
  label,
  onClick,
  color = 'var(--color-accent-primary)',
}: {
  icon: typeof FileText
  label: string
  onClick?: () => void
  color?: string
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 p-3 rounded-xl',
        'bg-[var(--color-bg-secondary)] border border-[var(--color-border)]',
        'hover:border-[var(--color-accent-primary)]/50',
        'transition-all duration-200',
        'group'
      )}
    >
      <div
        className="p-2 rounded-lg transition-all duration-200"
        style={{
          backgroundColor: `${color}15`,
        }}
      >
        <Icon
          size={20}
          className="transition-colors"
          style={{ color }}
        />
      </div>
      <span className="text-xs font-medium text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]">
        {label}
      </span>
    </motion.button>
  )
}

/**
 * Feature mini card for sidebar
 */
function FeatureMiniCard({
  feature,
  onClick,
}: {
  feature: Feature
  onClick?: () => void
}) {
  const statusConfig = useMemo(() => {
    if (feature.passes) {
      return {
        icon: CheckCircle2,
        color: 'var(--color-success)',
        bg: 'bg-[var(--color-success)]/10',
        border: 'border-[var(--color-success)]/30',
      }
    }
    if (feature.in_progress) {
      return {
        icon: Activity,
        color: 'var(--color-accent-primary)',
        bg: 'bg-[var(--color-accent-primary)]/10',
        border: 'border-[var(--color-accent-primary)]/30',
      }
    }
    return {
      icon: Clock,
      color: 'var(--color-warning)',
      bg: 'bg-[var(--color-warning)]/10',
      border: 'border-[var(--color-warning)]/30',
    }
  }, [feature])

  const StatusIcon = statusConfig.icon

  return (
    <motion.button
      whileHover={{ x: 4 }}
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 p-2 rounded-lg text-left',
        'hover:bg-[var(--color-bg-secondary)] transition-colors',
        'group'
      )}
    >
      <div className={cn('p-1 rounded', statusConfig.bg, statusConfig.border, 'border')}>
        <StatusIcon size={12} style={{ color: statusConfig.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">
          {feature.name}
        </p>
        <p className="text-[10px] text-[var(--color-text-tertiary)] truncate">
          {feature.category}
        </p>
      </div>
    </motion.button>
  )
}

export function CreativeSidebar({
  isOpen,
  onToggle,
  features,
  agentStatus = 'stopped',
  progress,
  onOpenSpec,
  onOpenConfig,
  onOpenTasks,
  onFeatureClick,
  className,
}: CreativeSidebarProps) {

  // Get recent/active features
  const activeFeatures = useMemo(() => {
    if (!features) return []
    const inProgress = features.in_progress.slice(0, 3)
    const pending = features.pending.slice(0, 3 - inProgress.length)
    return [...inProgress, ...pending]
  }, [features])

  const recentDone = useMemo(() => {
    if (!features) return []
    return features.done.slice(-3).reverse()
  }, [features])

  return (
    <motion.aside
      initial={false}
      animate={{ width: isOpen ? 280 : 64 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={cn(
        'fixed left-0 top-0 bottom-0 z-50',
        'bg-[var(--color-bg-primary)] border-r-2 border-[var(--color-border)]',
        'flex flex-col',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between">
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)]">
                <Brain size={18} className="text-white" />
              </div>
              <span className="font-display font-bold text-[var(--color-text-primary)]">
                MqxCode
              </span>
            </motion.div>
          )}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            {isOpen ? (
              <ChevronLeft size={18} className="text-[var(--color-text-secondary)]" />
            ) : (
              <ChevronRight size={18} className="text-[var(--color-text-secondary)]" />
            )}
          </motion.button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-6">
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Progress Ring */}
              <div className="flex flex-col items-center">
                <ProgressRing
                  percentage={progress.percentage}
                  agentStatus={agentStatus}
                />

                {/* Status badge */}
                <motion.div
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className={cn(
                    'mt-3 px-3 py-1 rounded-full text-xs font-medium',
                    'flex items-center gap-1.5',
                    agentStatus === 'running' && 'bg-[var(--color-accent-primary)]/15 text-[var(--color-accent-primary)]',
                    agentStatus === 'paused' && 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
                    agentStatus === 'crashed' && 'bg-[var(--color-danger)]/15 text-[var(--color-danger)]',
                    agentStatus === 'stopped' && 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]'
                  )}
                >
                  {agentStatus === 'running' && (
                    <>
                      <Sparkles size={12} className="animate-pulse" />
                      Agent Working
                    </>
                  )}
                  {agentStatus === 'paused' && (
                    <>
                      <AlertCircle size={12} />
                      Paused
                    </>
                  )}
                  {agentStatus === 'crashed' && (
                    <>
                      <AlertCircle size={12} />
                      Crashed
                    </>
                  )}
                  {agentStatus === 'stopped' && (
                    <>
                      <Zap size={12} />
                      Ready
                    </>
                  )}
                </motion.div>
              </div>

              {/* Stats */}
              <div className="space-y-2">
                <StatCard
                  label="Completed"
                  count={features?.done.length ?? 0}
                  icon={CheckCircle2}
                  color="var(--color-success)"
                  gradient="bg-gradient-to-r from-emerald-500/20 to-green-500/20"
                />
                <StatCard
                  label="In Progress"
                  count={features?.in_progress.length ?? 0}
                  icon={Activity}
                  color="var(--color-accent-primary)"
                  gradient="bg-gradient-to-r from-indigo-500/20 to-purple-500/20"
                />
                <StatCard
                  label="Pending"
                  count={features?.pending.length ?? 0}
                  icon={Clock}
                  color="var(--color-warning)"
                  gradient="bg-gradient-to-r from-amber-500/20 to-orange-500/20"
                />
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <QuickAction
                    icon={FileText}
                    label="Spec"
                    onClick={onOpenSpec}
                    color="var(--color-info)"
                  />
                  <QuickAction
                    icon={Settings2}
                    label="Config"
                    onClick={onOpenConfig}
                    color="var(--color-accent-secondary)"
                  />
                  <QuickAction
                    icon={MonitorCog}
                    label="Tasks"
                    onClick={onOpenTasks}
                    color="var(--color-success)"
                  />
                </div>
              </div>

              {/* Active Features */}
              {activeFeatures.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Activity size={12} />
                    Active Features
                  </h3>
                  <div className="space-y-1">
                    {activeFeatures.map((feature) => (
                      <FeatureMiniCard
                        key={feature.id}
                        feature={feature}
                        onClick={() => onFeatureClick?.(feature)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Completions */}
              {recentDone.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CheckCircle2 size={12} />
                    Recently Done
                  </h3>
                  <div className="space-y-1">
                    {recentDone.map((feature) => (
                      <FeatureMiniCard
                        key={feature.id}
                        feature={feature}
                        onClick={() => onFeatureClick?.(feature)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              {/* Mini progress */}
              <div className="relative w-10 h-10">
                <svg className="-rotate-90" width={40} height={40}>
                  <circle
                    cx={20}
                    cy={20}
                    r={16}
                    fill="none"
                    stroke="var(--color-bg-tertiary)"
                    strokeWidth={4}
                  />
                  <circle
                    cx={20}
                    cy={20}
                    r={16}
                    fill="none"
                    stroke={agentStatus === 'running' ? 'var(--color-accent-primary)' : 'var(--color-success)'}
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeDasharray={100}
                    strokeDashoffset={100 - progress.percentage}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[var(--color-text-primary)]">
                  {Math.round(progress.percentage)}
                </span>
              </div>

              {/* Mini stat indicators */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle2 size={12} className="text-[var(--color-success)]" />
                  <span className="text-xs font-medium text-[var(--color-text-primary)]">
                    {features?.done.length ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Activity size={12} className="text-[var(--color-accent-primary)]" />
                  <span className="text-xs font-medium text-[var(--color-text-primary)]">
                    {features?.in_progress.length ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Clock size={12} className="text-[var(--color-warning)]" />
                  <span className="text-xs font-medium text-[var(--color-text-primary)]">
                    {features?.pending.length ?? 0}
                  </span>
                </div>
              </div>

              {/* Quick action icons */}
              <div className="flex flex-col gap-2 mt-4">
                <button
                  onClick={onOpenSpec}
                  className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                  title="Spec Viewer"
                >
                  <FileText size={18} className="text-[var(--color-info)]" />
                </button>
                <button
                  onClick={onOpenConfig}
                  className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                  title="Config Center"
                >
                  <Settings2 size={18} className="text-[var(--color-accent-secondary)]" />
                </button>
                <button
                  onClick={onOpenTasks}
                  className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                  title="Server Tasks"
                >
                  <MonitorCog size={18} className="text-[var(--color-success)]" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 border-t border-[var(--color-border)]"
        >
          <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
            <span className="flex items-center gap-1">
              <BarChart3 size={12} />
              {progress.passing}/{progress.total} features
            </span>
          </div>
        </motion.div>
      )}
    </motion.aside>
  )
}

export default CreativeSidebar
