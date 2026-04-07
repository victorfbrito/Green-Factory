import { useState } from 'react'
import type { FactoryResponse } from '../../types'
import type { FactoryRenderModel } from '../../lib/procedural'
import { DEFAULT_FACTORY_VIEW_MODE, type FactoryViewMode } from './factoryViewMode'
import { WorldLayer } from './WorldLayer'
import { DistrictLayer } from './DistrictLayer'
import { ThreeWorldLayer } from './ThreeWorldLayer'
import { MapLegend } from './MapLegend'
import { CompoundXpBar } from './CompoundXpBar'
import { FactorySidebar } from './FactorySidebar'

interface FactoryMapProps {
  factory: FactoryResponse
  renderModel: FactoryRenderModel
  xpStepAmount: number
  xpDelta: number
  simulationTargetName: string | null
  onXpStepAmountChange: (amount: number) => void
  onAddXp: () => void
  onRemoveXp: () => void
}

function AxisWidget({ topDownView }: { topDownView: boolean }) {
  const axes = topDownView
    ? [
        { label: 'X', color: '#ef4444', x2: 74, y2: 40 },
        { label: 'Y', color: '#22c55e', x2: 24, y2: 14 },
        { label: 'Z', color: '#3b82f6', x2: 40, y2: 74 },
      ]
    : [
        { label: 'X', color: '#ef4444', x2: 70, y2: 56 },
        { label: 'Y', color: '#22c55e', x2: 40, y2: 10 },
        { label: 'Z', color: '#3b82f6', x2: 10, y2: 56 },
      ]

  return (
    <div className="factory-map__axis-widget" aria-label="Canvas axis guide">
      <svg viewBox="0 0 80 80" role="img" aria-hidden="true">
        <defs>
          <marker id="factory-axis-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" />
          </marker>
        </defs>
        {axes.map((axis) => (
          <g key={axis.label} style={{ color: axis.color }}>
            <line
              x1="40"
              y1="40"
              x2={axis.x2}
              y2={axis.y2}
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              markerEnd="url(#factory-axis-arrow)"
            />
            <text
              x={axis.x2}
              y={axis.y2}
              dx={axis.x2 >= 40 ? 6 : -10}
              dy={axis.y2 >= 40 ? 12 : -6}
              fill="currentColor"
              fontSize="12"
              fontWeight="700"
            >
              {axis.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

export function FactoryMap({
  factory,
  renderModel,
  xpStepAmount,
  xpDelta,
  simulationTargetName,
  onXpStepAmountChange,
  onAddXp,
  onRemoveXp,
}: FactoryMapProps) {
  const [viewMode, setViewMode] = useState<FactoryViewMode>(DEFAULT_FACTORY_VIEW_MODE)
  const [topDownView, setTopDownView] = useState(true)
  const [showVehicleTags, setShowVehicleTags] = useState(true)
  const { worldTheme, districts, compoundDrawables, nextCompoundDrawables, treeCells, blockLists, paths, serviceLaneCells } = renderModel
  const hasXpBar = factory.languages.length > 0
  return (
    <div
      className={[
        hasXpBar ? 'factory-map factory-map--has-xp-bar' : 'factory-map',
        viewMode === 'live' ? 'factory-map--live' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <CompoundXpBar factory={factory} />
      <AxisWidget topDownView={topDownView} />
      <div className="factory-map__controls">
        <div className="factory-map__vehicle-tags">
          <label className="factory-map__top-view-option">
            <input
              type="checkbox"
              checked={showVehicleTags}
              onChange={(e) => setShowVehicleTags(e.target.checked)}
            />
            Vehicle tags
          </label>
        </div>
        <div className="factory-map__view-mode" role="group" aria-label="Factory view mode">
          <span className="factory-map__view-mode-label">View</span>
          <label className="factory-map__view-mode-option">
            <input
              type="radio"
              name="factory-view-mode"
              checked={viewMode === 'live'}
              onChange={() => setViewMode('live')}
            />
            Live
          </label>
          <label className="factory-map__view-mode-option">
            <input
              type="radio"
              name="factory-view-mode"
              checked={viewMode === 'x-ray'}
              onChange={() => setViewMode('x-ray')}
            />
            X-ray
          </label>
        </div>
        <div className="factory-map__top-view">
          <label className="factory-map__top-view-option">
            <input
              type="checkbox"
              checked={topDownView}
              onChange={(e) => setTopDownView(e.target.checked)}
            />
            Top view
          </label>
        </div>
      </div>
      <WorldLayer theme={worldTheme} />
      <ThreeWorldLayer
        districts={districts}
        compoundDrawables={compoundDrawables}
        nextCompoundDrawables={nextCompoundDrawables}
        treeCells={treeCells}
        blockLists={blockLists}
        paths={paths}
        serviceLaneCells={serviceLaneCells}
        viewMode={viewMode}
        topDownView={topDownView}
        showVehicleTags={showVehicleTags}
      />
      <DistrictLayer districts={districts} viewMode={viewMode} />
      <MapLegend districts={districts} />
      <FactorySidebar
        factory={factory}
        xpStepAmount={xpStepAmount}
        xpDelta={xpDelta}
        simulationTargetName={simulationTargetName}
        onXpStepAmountChange={onXpStepAmountChange}
        onAddXp={onAddXp}
        onRemoveXp={onRemoveXp}
      />
    </div>
  )
}
