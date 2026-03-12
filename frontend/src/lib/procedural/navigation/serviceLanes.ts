/**
 * Stage F: Service lane layer.
 * Service lane – Short 1-cell-wide lane from district entrance into the district.
 * Uses only existing empty cells. Never carves new space.
 */

import { cellKey } from '../grid'
import { isWalkable, type NavGrid } from './navGrid'
import type { PathCell } from './paths'

const MAX_SERVICE_LANE_STEPS = 4

/**
 * Build service lane cells from each district entrance toward anchor.
 * Only uses existing empty cells. Never modifies compounds.
 */
export function buildServiceLanes(
  grid: NavGrid,
  paths: PathCell[][],
  districtEntrances: { cx: number; cy: number }[],
  districtAnchors: { cx: number; cy: number }[]
): PathCell[] {
  const roadCells = new Set<string>()
  for (const path of paths) {
    for (const cell of path) {
      roadCells.add(cellKey(cell.cx, cell.cy))
    }
  }

  const serviceLaneCells: PathCell[] = []

  for (let i = 0; i < districtEntrances.length; i++) {
    const entry = districtEntrances[i]
    const anchor = districtAnchors[i] ?? entry
    const acx = anchor.cx
    const acy = anchor.cy

    let cx = entry.cx
    let cy = entry.cy

    for (let s = 0; s < MAX_SERVICE_LANE_STEPS; s++) {
      const dx = acx - cx
      const dy = acy - cy
      if (dx === 0 && dy === 0) break
      const ax = Math.abs(dx)
      const ay = Math.abs(dy)
      const nx = ax >= ay ? cx + Math.sign(dx) : cx
      const ny = ax >= ay ? cy : cy + Math.sign(dy)
      if (nx === cx && ny === cy) break
      const nk = cellKey(nx, ny)
      if (!isWalkable(grid, nx, ny) || roadCells.has(nk)) break
      cx = nx
      cy = ny
      serviceLaneCells.push({ cx, cy })
    }
  }

  return serviceLaneCells
}
