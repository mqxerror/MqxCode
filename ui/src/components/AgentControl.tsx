import { Play, Square, Loader2, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import {
  useStartAgent,
  useStopAgent,
  useSettings,
} from '../hooks/useProjects'
import type { AgentStatus } from '../lib/types'
import { cn } from './aceternity/cn'

interface AgentControlProps {
  projectName: string
  status: AgentStatus
}

export function AgentControl({ projectName, status }: AgentControlProps) {
  const { data: settings } = useSettings()
  const yoloMode = settings?.yolo_mode ?? false

  const startAgent = useStartAgent(projectName)
  const stopAgent = useStopAgent(projectName)

  const isLoading = startAgent.isPending || stopAgent.isPending

  const handleStart = () => startAgent.mutate(yoloMode)
  const handleStop = () => stopAgent.mutate()

  // Simplified: either show Start (when stopped/crashed) or Stop (when running/paused)
  const isStopped = status === 'stopped' || status === 'crashed'

  return (
    <div className="flex items-center gap-2">
      {isStopped ? (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleStart}
          disabled={isLoading}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all",
            yoloMode
              ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30"
              : "btn btn-success"
          )}
          title={yoloMode ? 'Start Agent (YOLO Mode)' : 'Start Agent'}
          aria-label={yoloMode ? 'Start Agent in YOLO Mode' : 'Start Agent'}
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : yoloMode ? (
            <Zap size={16} />
          ) : (
            <Play size={16} />
          )}
          <span className="hidden sm:inline">{yoloMode ? 'YOLO' : 'Start'}</span>
        </motion.button>
      ) : (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleStop}
          disabled={isLoading}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all",
            yoloMode
              ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30 animate-pulse"
              : "btn btn-danger"
          )}
          title={yoloMode ? 'Stop Agent (YOLO Mode)' : 'Stop Agent'}
          aria-label={yoloMode ? 'Stop Agent in YOLO Mode' : 'Stop Agent'}
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Square size={16} />
          )}
          <span className="hidden sm:inline">Stop</span>
        </motion.button>
      )}

      {/* Running indicator */}
      {!isStopped && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-2"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent-primary)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-accent-primary)]"></span>
          </span>
          <span className="text-xs text-[var(--color-text-secondary)] hidden sm:inline">
            {status === 'running' ? 'Running' : 'Paused'}
          </span>
        </motion.div>
      )}
    </div>
  )
}
