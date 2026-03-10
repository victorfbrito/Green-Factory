import type { UpgradePlacement } from '../../lib/procedural'

interface UpgradeLayerProps {
  upgrades: UpgradePlacement[]
}

const UPGRADE_LABELS: Record<string, string> = {
  solar_panels: '☀',
  water_recycling: '♻',
  wind_turbines: '💨',
  green_roofs: '🌿',
  electric_transport: '🔌',
  urban_trees: '🌳',
  carbon_capture: '🔄',
}

export function UpgradeLayer({ upgrades }: UpgradeLayerProps) {
  return (
    <div className="factory-map__upgrades">
      {upgrades.map((u) => (
        <div
          key={u.id}
          title={u.id.replace(/_/g, ' ')}
          style={{
            position: 'absolute',
            left: u.x - 12,
            top: u.y - 12,
            width: 24,
            height: 24,
            background: 'var(--world-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            opacity: 0.9,
          }}
        >
          {UPGRADE_LABELS[u.id] ?? '•'}
        </div>
      ))}
    </div>
  )
}
