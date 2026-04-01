import { useState } from 'react'
import type { FactoryResponse } from '../../types'
import type { FactoryRenderModel } from '../../lib/procedural'
import { DEFAULT_FACTORY_VIEW_MODE, type FactoryViewMode } from './factoryViewMode'
import { WorldLayer } from './WorldLayer'
import { DistrictLayer } from './DistrictLayer'
import { ThreeWorldLayer } from './ThreeWorldLayer'
import { MapLegend } from './MapLegend'
import { CompoundXpBar } from './CompoundXpBar'

interface FactoryMapProps {
  factory: FactoryResponse
  renderModel: FactoryRenderModel
}

export function FactoryMap({ factory, renderModel }: FactoryMapProps) {
  const [viewMode, setViewMode] = useState<FactoryViewMode>(DEFAULT_FACTORY_VIEW_MODE)
  const { worldTheme, districts, compoundDrawables, blockLists, paths, serviceLaneCells } = renderModel
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
      <WorldLayer theme={worldTheme} />
      <ThreeWorldLayer
        districts={districts}
        compoundDrawables={compoundDrawables}
        blockLists={blockLists}
        paths={paths}
        serviceLaneCells={serviceLaneCells}
        viewMode={viewMode}
      />
      <DistrictLayer districts={districts} viewMode={viewMode} />
      <MapLegend districts={districts} />
    </div>
  )
}
