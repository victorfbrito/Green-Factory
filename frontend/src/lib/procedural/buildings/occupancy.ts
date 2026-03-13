/**
 * Building layer: occupancy from all compounds.
 * This is the obstacle source for pathfinding.
 * Paths and service lanes never modify this layer.
 */

import type { Compound } from '../compounds/compoundExtract'
import { getCompoundCells } from '../compounds/compoundExtract'

/**
 * Build a set of blocked cell keys from compounds.
 * Used by navigation layer to build pathfinding grid.
 */
export function getCompoundOccupancy(compounds: Compound[]): Set<string> {
  const blocked = new Set<string>()
  for (const c of compounds) {
    for (const k of getCompoundCells(c)) {
      blocked.add(k)
    }
  }
  return blocked
}
