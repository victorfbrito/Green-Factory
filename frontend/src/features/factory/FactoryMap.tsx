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
      <div className="factory-map__controls">
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
