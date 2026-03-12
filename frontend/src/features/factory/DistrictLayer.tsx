import type { DistrictPlacement } from '../../lib/procedural'
import { buildAllDistrictBlocks } from '../../lib/procedural'

interface DistrictLayerProps {
  districts: DistrictPlacement[]
}

export function DistrictLayer({ districts }: DistrictLayerProps) {
  const { blockLists } = buildAllDistrictBlocks(districts)

  // Debug: how many blocks per language are being rendered
  if (typeof window !== 'undefined') {
    console.log(
      '[DistrictLayer] blocks per district',
      districts.map((d, i) => ({
        index: i,
        language: d.language.language_name,
        course_id: d.language.course_id,
        xp: d.language.xp,
        seed_key: d.language.seed_key,
        blocks: blockLists[i]?.length ?? 0,
      }))
    )
  }

  return (
    <div className="factory-map__districts">
      {districts.map((d) => {
        const isCurrent = d.language.is_current
        return (
          <div
            key={d.language.seed_key}
            className={`factory-map__district ${isCurrent ? 'factory-map__district--current' : ''}`}
            style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, pointerEvents: 'none' }}
          >
            {/* Visual ring only; pointer-events: none so the canvas receives drag */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                left: d.x - d.radius,
                top: d.y - d.radius,
                width: d.radius * 2,
                height: d.radius * 2,
                pointerEvents: 'none',
                zIndex: 0,
                boxShadow: isCurrent ? `0 0 0 2px var(--world-accent)` : undefined,
              }}
            />
            {/* Block visuals are now rendered in the Three.js isometric scene (ThreeWorldLayer). */}
          </div>
        )
      })}
    </div>
  )
}
