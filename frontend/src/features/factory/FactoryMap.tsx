import type { FactorySceneModel } from '../../lib/procedural'
import { WorldLayer } from './WorldLayer'
import { DistrictLayer } from './DistrictLayer'
import { ThreeWorldLayer } from './ThreeWorldLayer'
import { MapLegend } from './MapLegend'

interface FactoryMapProps {
  scene: FactorySceneModel
}

export function FactoryMap({ scene }: FactoryMapProps) {
  const { worldTheme, districts } = scene
  return (
    <div className="factory-map">
      <WorldLayer theme={worldTheme} />
      <ThreeWorldLayer districts={districts} />
      <DistrictLayer districts={districts} />
      <MapLegend districts={districts} />
    </div>
  )
}
