import type { FactorySceneModel } from '../../lib/procedural'
import { WorldLayer } from './WorldLayer'
import { PathLayer } from './PathLayer'
import { DistrictLayer } from './DistrictLayer'
import { UpgradeLayer } from './UpgradeLayer'

interface FactoryMapProps {
  scene: FactorySceneModel
  selectedDistrictIndex: number | null
  onSelectDistrict: (index: number) => void
}

export function FactoryMap({ scene, selectedDistrictIndex, onSelectDistrict }: FactoryMapProps) {
  const { worldTheme, districts, upgrades } = scene
  return (
    <div className="factory-map">
      <WorldLayer theme={worldTheme} />
      <PathLayer districts={districts} />
      <DistrictLayer
        districts={districts}
        selectedIndex={selectedDistrictIndex}
        onSelect={onSelectDistrict}
      />
      <UpgradeLayer upgrades={upgrades} />
    </div>
  )
}
