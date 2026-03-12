/**
 * Building layer: occupancy from blocks.
 * This is the obstacle source for pathfinding.
 * Navigation grid reads this; paths never modify it.
 */

import { cellKey, CELL_SIZE, GRID_SIZE } from '../grid'
import type { Block } from './blocks'

/**
 * Build a set of blocked cell keys from blocks.
 * Used by navigation layer to build pathfinding grid.
 */
export function getBuildingOccupancy(blocks: Block[]): Set<string> {
  const blocked = new Set<string>()
  for (const b of blocks) {
    const cxStart = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(b.x / CELL_SIZE)))
    const cxEnd = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((b.x + b.w - 0.001) / CELL_SIZE)))
    const cyStart = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(b.y / CELL_SIZE)))
    const cyEnd = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((b.y + b.h - 0.001) / CELL_SIZE)))
    for (let cx = cxStart; cx <= cxEnd; cx++) {
      for (let cy = cyStart; cy <= cyEnd; cy++) {
        blocked.add(cellKey(cx, cy))
      }
    }
  }
  return blocked
}
