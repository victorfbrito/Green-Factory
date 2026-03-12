/**
 * Navigation grid – read-only pathfinding grid built from existing map state.
 * Built from building occupancy. Paths read this; they never modify compounds or block counts.
 */

import { cellKey, GRID_SIZE } from '../grid'

export interface NavGrid {
  width: number
  height: number
  blocked: Set<string>
}

/**
 * Build navigation grid from building occupancy.
 * blocked = cells that cannot be traversed (buildings).
 * Roads/paths are NOT blocked; they are walkable.
 */
export function buildNavGrid(blockedCells: Set<string>): NavGrid {
  return {
    width: GRID_SIZE,
    height: GRID_SIZE,
    blocked: new Set(blockedCells),
  }
}

export function isWalkable(grid: NavGrid, cx: number, cy: number): boolean {
  if (cx < 0 || cx >= grid.width || cy < 0 || cy >= grid.height) return false
  return !grid.blocked.has(cellKey(cx, cy))
}
