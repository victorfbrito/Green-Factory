/**
 * Service lane layer.
 * Service lanes connect blocks within a district (1-cell lanes between blocks)
 * and connect the district entrance to the block network.
 * Uses only existing empty cells. Never modifies compounds.
 */

import { cellKey } from '../grid'
import { isWalkable, type NavGrid } from './navGrid'
import type { PathCell } from './paths'

const MAX_ENTRANCE_LANE_STEPS = 6

/**
 * Build service lane cells: block connection lanes + path from entrance to block network.
 * Block lane cells are the 1-cell gaps between blocks.
 * Entrance lanes connect the main path entrance to the nearest block lane.
 */
export function buildServiceLanes(
  grid: NavGrid,
  paths: PathCell[][],
  districtEntrances: { cx: number; cy: number }[],
  districtAnchors: { cx: number; cy: number }[],
  blockLaneCellsByDistrict: { cx: number; cy: number }[][]
): PathCell[] {
  const roadCells = new Set<string>()
  for (const path of paths) {
    for (const cell of path) {
      roadCells.add(cellKey(cell.cx, cell.cy))
    }
  }

  const serviceLaneCells: PathCell[] = []

  for (let i = 0; i < districtEntrances.length; i++) {
    const blockLanes = blockLaneCellsByDistrict[i] ?? []

    for (const cell of blockLanes) {
      const k = cellKey(cell.cx, cell.cy)
      if (isWalkable(grid, cell.cx, cell.cy) && !roadCells.has(k)) {
        serviceLaneCells.push({ cx: cell.cx, cy: cell.cy })
        roadCells.add(k)
      }
    }

    const entry = districtEntrances[i]
    const anchor = districtAnchors[i] ?? entry
    const acx = anchor.cx
    const acy = anchor.cy

    let cx = entry.cx
    let cy = entry.cy

    for (let s = 0; s < MAX_ENTRANCE_LANE_STEPS; s++) {
      const nk = cellKey(cx, cy)
      if (blockLanes.some((lc) => cellKey(lc.cx, lc.cy) === nk)) break

      const dx = acx - cx
      const dy = acy - cy
      if (dx === 0 && dy === 0) break
      const ax = Math.abs(dx)
      const ay = Math.abs(dy)
      const nx = ax >= ay ? cx + Math.sign(dx) : cx
      const ny = ax >= ay ? cy : cy + Math.sign(dy)
      if (nx === cx && ny === cy) break
      const nextK = cellKey(nx, ny)
      if (!isWalkable(grid, nx, ny) || roadCells.has(nextK)) break
      cx = nx
      cy = ny
      serviceLaneCells.push({ cx, cy })
      roadCells.add(nextK)
    }
  }

  return serviceLaneCells
}
