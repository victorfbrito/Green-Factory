import type { DistrictPlacement, PathCell } from '../../lib/procedural'
import { buildAllDistrictBlocks, buildCampusPaths, CELL_SIZE } from '../../lib/procedural'

interface PathLayerProps {
  districts: DistrictPlacement[]
}

export function PathLayer({ districts }: PathLayerProps) {
  if (districts.length === 0) return null
  const { blockLists } = buildAllDistrictBlocks(districts)
  const { paths } = buildCampusPaths(districts, blockLists)
  if (paths.length === 0) return null

  return (
    <div className="factory-map__paths" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {paths.map((path, pi) =>
        path.map((cell: PathCell, ci) => (
          <div
            key={`${pi}-${ci}`}
            style={{
              position: 'absolute',
              left: cell.cx * CELL_SIZE + CELL_SIZE * 0.25,
              top: cell.cy * CELL_SIZE + CELL_SIZE * 0.25,
              width: CELL_SIZE * 0.5,
              height: CELL_SIZE * 0.5,
              borderRadius: CELL_SIZE * 0.25,
              background: 'rgba(120, 120, 120, 0.9)',
              boxShadow: '0 0 0 2px rgba(0,0,0,0.25)',
              pointerEvents: 'none',
              zIndex: 0.5,
            }}
          />
        ))
      )}
    </div>
  )
}

