import { WifiOff, CheckCircle, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { SpotlightCard } from './aceternity'

interface ProgressDashboardProps {
  passing: number
  total: number
  percentage: number
  isConnected: boolean
}

export function ProgressDashboard({
  passing,
  total,
  percentage,
  isConnected,
}: ProgressDashboardProps) {
  const pending = total - passing

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Main Progress Card */}
      <SpotlightCard
        className="md:col-span-2 card p-6"
        spotlightColor="rgba(99, 102, 241, 0.15)"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold text-[var(--color-text-primary)]">
            Progress
          </h2>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-2"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-success)]"></span>
                </span>
                <span className="text-sm text-[var(--color-success)] font-medium">Live</span>
              </motion.div>
            ) : (
              <div className="flex items-center gap-2">
                <WifiOff size={14} className="text-[var(--color-danger)]" />
                <span className="text-sm text-[var(--color-danger)]">Offline</span>
              </div>
            )}
          </div>
        </div>

        {/* Large Percentage */}
        <div className="text-center mb-6">
          <motion.span
            key={percentage}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="font-display text-6xl font-bold gradient-text"
          >
            {percentage.toFixed(1)}
          </motion.span>
          <span className="font-display text-2xl font-bold text-[var(--color-text-tertiary)]">
            %
          </span>
        </div>

        {/* Progress Bar */}
        <div className="relative h-3 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden mb-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              background: 'linear-gradient(90deg, var(--color-accent-primary), var(--color-accent-secondary))',
              boxShadow: percentage > 0 ? '0 0 20px rgba(99, 102, 241, 0.5)' : 'none'
            }}
          />
        </div>

        <div className="flex justify-between text-sm text-[var(--color-text-tertiary)]">
          <span>{passing} completed</span>
          <span>{total} total</span>
        </div>
      </SpotlightCard>

      {/* Stats Cards */}
      <SpotlightCard
        className="card p-5"
        spotlightColor="rgba(16, 185, 129, 0.15)"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">
            Completed
          </span>
          <span className="p-2 rounded-lg bg-[var(--color-success)]/10 text-[var(--color-success)]">
            <CheckCircle size={18} />
          </span>
        </div>
        <motion.span
          key={passing}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="text-3xl font-bold font-display text-[var(--color-success)]"
        >
          {passing}
        </motion.span>
        <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">
          features done
        </p>
      </SpotlightCard>

      <SpotlightCard
        className="card p-5"
        spotlightColor="rgba(245, 158, 11, 0.15)"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">
            Pending
          </span>
          <span className="p-2 rounded-lg bg-[var(--color-warning)]/10 text-[var(--color-warning)]">
            <Clock size={18} />
          </span>
        </div>
        <motion.span
          key={pending}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="text-3xl font-bold font-display text-[var(--color-warning)]"
        >
          {pending}
        </motion.span>
        <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">
          remaining
        </p>
      </SpotlightCard>
    </div>
  )
}
