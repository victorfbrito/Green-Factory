import type { DistrictPlacement } from '../../lib/procedural'
import { BLOCK_COLORS, PATH_COLOR, SERVICE_LANE_COLOR } from './constants'

interface MapLegendProps {
  districts: DistrictPlacement[]
}

export function MapLegend({ districts }: MapLegendProps) {
  return (
    <div className="factory-map__legend">
      {districts.map((d, i) => (
        <div key={d.language.seed_key} className="factory-map__legend-item">
          <span
            className="factory-map__legend-swatch"
            style={{ backgroundColor: BLOCK_COLORS[i % BLOCK_COLORS.length] }}
          />
          <span className="factory-map__legend-label">{d.language.language_name}</span>
        </div>
      ))}
      <div className="factory-map__legend-item">
        <span
          className="factory-map__legend-swatch"
          style={{ backgroundColor: PATH_COLOR }}
        />
        <span className="factory-map__legend-label">Path</span>
      </div>
      <div className="factory-map__legend-item">
        <span
          className="factory-map__legend-swatch"
          style={{ backgroundColor: SERVICE_LANE_COLOR }}
        />
        <span className="factory-map__legend-label">Service lane</span>
      </div>
    </div>
  )
}
