/**
 * Dependency Graph Visualization
 *
 * Displays feature dependencies as a visual graph.
 * Shows which features are blocked and which are ready.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  RefreshCw,
  GitBranch,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  X,
  Plus,
} from 'lucide-react'
import type { DependencyGraph, DependencyNode } from '../lib/types'
import { getDependencyGraph, addFeatureDependencies, removeFeatureDependency } from '../lib/api'

interface DependencyGraphProps {
  projectName: string
  onRefresh?: () => void
}

function FeatureNode({
  node,
  isBlocked,
  isReady,
  isSelected,
  onSelect,
  dependsOnCount,
  blocksCount,
}: {
  node: DependencyNode
  isBlocked: boolean
  isReady: boolean
  isSelected: boolean
  onSelect: () => void
  dependsOnCount: number
  blocksCount: number
}) {
  const getStatusColor = () => {
    if (node.passes) return 'var(--color-success)'
    if (node.in_progress) return 'var(--color-accent)'
    if (isBlocked) return 'var(--color-danger)'
    if (isReady) return 'var(--color-warning)'
    return 'var(--color-text-tertiary)'
  }

  const getStatusIcon = () => {
    if (node.passes) return <CheckCircle2 size={14} />
    if (node.in_progress) return <Clock size={14} className="animate-pulse" />
    if (isBlocked) return <Lock size={14} />
    if (isReady) return <Unlock size={14} />
    return <Clock size={14} />
  }

  return (
    <div
      className={`card p-3 cursor-pointer transition-all ${
        isSelected
          ? 'ring-2 ring-[var(--color-accent)] border-[var(--color-accent)]'
          : 'hover:border-[var(--color-accent)]'
      }`}
      onClick={onSelect}
      style={{ borderLeftWidth: 4, borderLeftColor: getStatusColor() }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span style={{ color: getStatusColor() }}>{getStatusIcon()}</span>
            <span className="font-bold text-sm truncate">{node.name}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
            <span className="px-1.5 py-0.5 bg-[var(--color-bg-tertiary)] rounded">
              {node.category}
            </span>
            <span>#{node.id}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs">
          {dependsOnCount > 0 && (
            <span className="text-[var(--color-text-secondary)]">
              {dependsOnCount} dep{dependsOnCount !== 1 ? 's' : ''}
            </span>
          )}
          {blocksCount > 0 && (
            <span className="text-[var(--color-warning)]">
              blocks {blocksCount}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function AddDependencyModal({
  feature,
  availableFeatures,
  onAdd,
  onClose,
}: {
  feature: DependencyNode
  availableFeatures: DependencyNode[]
  onAdd: (dependsOnId: number) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="card p-6 w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-lg">
            Add Dependency for "{feature.name}"
          </h3>
          <button onClick={onClose} className="btn btn-ghost btn-icon p-2">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
          Select a feature that must be completed before this one:
        </p>

        <div className="flex-1 overflow-y-auto space-y-2">
          {availableFeatures.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-secondary)]">
              No available features to add as dependencies
            </div>
          ) : (
            availableFeatures.map((f) => (
              <button
                key={f.id}
                onClick={() => onAdd(f.id)}
                className="w-full text-left p-3 rounded-lg border-2 border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{f.name}</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {f.category}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export function DependencyGraphView({ projectName, onRefresh }: DependencyGraphProps) {
  const [graph, setGraph] = useState<DependencyGraph | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFeatureId, setSelectedFeatureId] = useState<number | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const fetchGraph = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getDependencyGraph(projectName)
      setGraph(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dependency graph')
    } finally {
      setIsLoading(false)
    }
  }, [projectName])

  useEffect(() => {
    fetchGraph()
  }, [fetchGraph])

  const selectedFeature = useMemo(() => {
    if (!graph || !selectedFeatureId) return null
    return graph.features.find((f) => f.id === selectedFeatureId) || null
  }, [graph, selectedFeatureId])

  const selectedDependencies = useMemo(() => {
    if (!graph || !selectedFeatureId) return { dependsOn: [], blocks: [] }

    const dependsOn = graph.edges
      .filter((e) => e.target === selectedFeatureId)
      .map((e) => graph.features.find((f) => f.id === e.source))
      .filter(Boolean) as DependencyNode[]

    const blocks = graph.edges
      .filter((e) => e.source === selectedFeatureId)
      .map((e) => graph.features.find((f) => f.id === e.target))
      .filter(Boolean) as DependencyNode[]

    return { dependsOn, blocks }
  }, [graph, selectedFeatureId])

  const availableDependencies = useMemo(() => {
    if (!graph || !selectedFeatureId) return []

    const existingDeps = new Set(
      graph.edges
        .filter((e) => e.target === selectedFeatureId)
        .map((e) => e.source)
    )

    return graph.features.filter(
      (f) => f.id !== selectedFeatureId && !existingDeps.has(f.id)
    )
  }, [graph, selectedFeatureId])

  const handleAddDependency = async (dependsOnId: number) => {
    if (!selectedFeatureId) return

    try {
      await addFeatureDependencies(projectName, selectedFeatureId, [dependsOnId])
      await fetchGraph()
      onRefresh?.()
      setShowAddModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add dependency')
    }
  }

  const handleRemoveDependency = async (dependsOnId: number) => {
    if (!selectedFeatureId) return

    try {
      await removeFeatureDependency(projectName, selectedFeatureId, dependsOnId)
      await fetchGraph()
      onRefresh?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove dependency')
    }
  }

  const getDependsOnCount = (featureId: number) =>
    graph?.edges.filter((e) => e.target === featureId).length ?? 0

  const getBlocksCount = (featureId: number) =>
    graph?.edges.filter((e) => e.source === featureId).length ?? 0

  if (isLoading) {
    return (
      <div className="card p-6 flex items-center justify-center">
        <RefreshCw className="animate-spin" size={24} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitBranch size={20} className="text-[var(--color-accent)]" />
            <h3 className="font-display font-bold text-lg">Feature Dependencies</h3>
          </div>
          <button onClick={fetchGraph} className="btn btn-ghost btn-icon p-2">
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-[var(--color-bg-tertiary)] rounded-lg border-2 border-[var(--color-border)]">
            <div className="text-2xl font-bold text-[var(--color-danger)]">
              {graph?.blocked_features.length ?? 0}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">Blocked</div>
          </div>
          <div className="text-center p-3 bg-[var(--color-bg-tertiary)] rounded-lg border-2 border-[var(--color-border)]">
            <div className="text-2xl font-bold text-[var(--color-warning)]">
              {graph?.ready_features.length ?? 0}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">Ready</div>
          </div>
          <div className="text-center p-3 bg-[var(--color-bg-tertiary)] rounded-lg border-2 border-[var(--color-border)]">
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">
              {graph?.edges.length ?? 0}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">Dependencies</div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-3 bg-[var(--color-danger)] text-white flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Feature List */}
        <div className="lg:col-span-2 space-y-2">
          {graph?.features.map((node) => (
            <FeatureNode
              key={node.id}
              node={node}
              isBlocked={graph.blocked_features.includes(node.id)}
              isReady={graph.ready_features.includes(node.id)}
              isSelected={selectedFeatureId === node.id}
              onSelect={() => setSelectedFeatureId(node.id)}
              dependsOnCount={getDependsOnCount(node.id)}
              blocksCount={getBlocksCount(node.id)}
            />
          ))}
        </div>

        {/* Selected Feature Details */}
        <div className="space-y-4">
          {selectedFeature ? (
            <>
              <div className="card p-4">
                <h4 className="font-display font-bold mb-2">{selectedFeature.name}</h4>
                <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                  {selectedFeature.category} &bull; Priority {selectedFeature.priority}
                </p>

                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn btn-primary w-full"
                >
                  <Plus size={16} />
                  Add Dependency
                </button>
              </div>

              {/* Depends On */}
              {selectedDependencies.dependsOn.length > 0 && (
                <div className="card p-4">
                  <h5 className="font-bold text-sm mb-3 flex items-center gap-2">
                    <ArrowRight size={14} />
                    Depends On ({selectedDependencies.dependsOn.length})
                  </h5>
                  <div className="space-y-2">
                    {selectedDependencies.dependsOn.map((dep) => (
                      <div
                        key={dep.id}
                        className="flex items-center justify-between p-2 bg-[var(--color-bg-tertiary)] rounded"
                      >
                        <div className="flex items-center gap-2">
                          {dep.passes ? (
                            <CheckCircle2 size={14} className="text-[var(--color-success)]" />
                          ) : (
                            <Clock size={14} className="text-[var(--color-warning)]" />
                          )}
                          <span className="text-sm">{dep.name}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveDependency(dep.id)}
                          className="btn btn-ghost btn-icon p-1 text-[var(--color-danger)]"
                          title="Remove dependency"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Blocks */}
              {selectedDependencies.blocks.length > 0 && (
                <div className="card p-4">
                  <h5 className="font-bold text-sm mb-3 flex items-center gap-2">
                    <Lock size={14} />
                    Blocks ({selectedDependencies.blocks.length})
                  </h5>
                  <div className="space-y-2">
                    {selectedDependencies.blocks.map((dep) => (
                      <div
                        key={dep.id}
                        className="flex items-center gap-2 p-2 bg-[var(--color-bg-tertiary)] rounded"
                      >
                        <span className="text-sm">{dep.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card p-8 text-center">
              <GitBranch size={48} className="mx-auto mb-4 text-[var(--color-text-tertiary)]" />
              <p className="text-sm text-[var(--color-text-secondary)]">
                Select a feature to view and manage its dependencies
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Dependency Modal */}
      {showAddModal && selectedFeature && (
        <AddDependencyModal
          feature={selectedFeature}
          availableFeatures={availableDependencies}
          onAdd={handleAddDependency}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}
