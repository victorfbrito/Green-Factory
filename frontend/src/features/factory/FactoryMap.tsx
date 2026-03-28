import type { FactoryResponse } from '../../types'
import type { FactoryRenderModel } from '../../lib/procedural'
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
  const { worldTheme, districts, compoundDrawables, blockLists, paths, serviceLaneCells } = renderModel
  const hasXpBar = factory.languages.length > 0
  return (
    <div className={hasXpBar ? 'factory-map factory-map--has-xp-bar' : 'factory-map'}>
      <CompoundXpBar factory={factory} />
      <WorldLayer theme={worldTheme} />
      <ThreeWorldLayer
        districts={districts}
        compoundDrawables={compoundDrawables}
        blockLists={blockLists}
        paths={paths}
        serviceLaneCells={serviceLaneCells}
      />
      <DistrictLayer districts={districts} />
      <MapLegend districts={districts} />
    </div>
  )
}
