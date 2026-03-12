import type { FactoryRenderModel } from '../../lib/procedural'
import { WorldLayer } from './WorldLayer'
import { DistrictLayer } from './DistrictLayer'
import { ThreeWorldLayer } from './ThreeWorldLayer'
import { MapLegend } from './MapLegend'

interface FactoryMapProps {
  renderModel: FactoryRenderModel
}

export function FactoryMap({ renderModel }: FactoryMapProps) {
  const { worldTheme, districts, blockLists, paths, serviceLaneCells } = renderModel
  return (
    <div className="factory-map">
      <WorldLayer theme={worldTheme} />
      <ThreeWorldLayer
        districts={districts}
        blockLists={blockLists}
        paths={paths}
        serviceLaneCells={serviceLaneCells}
      />
      <DistrictLayer districts={districts} />
      <MapLegend districts={districts} />
    </div>
  )
}
