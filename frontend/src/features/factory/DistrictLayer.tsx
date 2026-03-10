import type { DistrictPlacement } from '../../lib/procedural'
import { buildAllDistrictBlocks } from '../../lib/procedural'
import { DISTRICT_COLORS } from './constants'

interface DistrictLayerProps {
  districts: DistrictPlacement[]
  selectedIndex: number | null
  onSelect: (index: number) => void
}

export function DistrictLayer({ districts, selectedIndex, onSelect }: DistrictLayerProps) {
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
      {districts.map((d, i) => {
        const isCurrent = d.language.is_current
        const isSelected = selectedIndex === i
        const baseColor = DISTRICT_COLORS[i % DISTRICT_COLORS.length]
        const blocks = blockLists[i] ?? []
        return (
          <div
            key={d.language.seed_key}
            className={`factory-map__district ${isCurrent ? 'factory-map__district--current' : ''} ${isSelected ? 'factory-map__district--selected' : ''}`}
            style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, pointerEvents: 'none' }}
          >
            {/* Hit target: anchor ± radius, receives click */}
            <div
              role="button"
              tabIndex={0}
              aria-label={`District: ${d.language.language_name}`}
              style={{
                position: 'absolute',
                left: d.x - d.radius,
                top: d.y - d.radius,
                width: d.radius * 2,
                height: d.radius * 2,
                pointerEvents: 'auto',
                cursor: 'pointer',
                zIndex: 0,
                boxShadow: isCurrent || isSelected ? `0 0 0 2px var(--world-accent)` : undefined,
              }}
              onClick={() => onSelect(i)}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(i)}
            />
            {/* Block cluster on shared world grid */}
            {blocks.map((block, bi) => (
              <div
                key={bi}
                className={`factory-map__district-block ${block.isLandmark ? 'factory-map__district-block--landmark' : ''}`}
                style={{
                  position: 'absolute',
                  left: block.x,
                  top: block.y,
                  width: block.w,
                  height: block.h,
                  background: baseColor,
                  filter: `brightness(${block.shade})`,
                  boxShadow: 'var(--district-shadow)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
