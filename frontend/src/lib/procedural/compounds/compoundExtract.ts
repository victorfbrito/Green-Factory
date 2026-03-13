/**
 * Extract rectangular Compounds from building cells.
 * Compound = smallest building mass. One rectangle per compound.
 * Rectangles only: 2×1, 2×2, 3×1, 3×2, 3×3, 1×1.
 */

import { cellKey, CELL_SIZE } from '../grid'

export interface Compound {
  /** Top-left cell X */
  cx: number
  /** Top-left cell Y */
  cy: number
  /** Width in cells */
  w: number
  /** Height in cells */
  h: number
  /** Reserved 2×2 landmark in larger districts */
  isLandmark?: boolean
}

const gap = 1
const cellW = CELL_SIZE - gap
const rectW = (n: number) => CELL_SIZE * n - gap

/**
 * Convert compound to world coordinates for rendering.
 * Returns { x, y, w, h } in world space.
 */
export function compoundToWorld(compound: Compound): { x: number; y: number; w: number; h: number } {
  const x = compound.cx * CELL_SIZE + gap / 2
  const y = compound.cy * CELL_SIZE + gap / 2
  const w = compound.w === 1 ? cellW : rectW(compound.w)
  const h = compound.h === 1 ? cellW : rectW(compound.h)
  return { x, y, w, h }
}

/**
 * Get all cell keys occupied by a compound.
 */
export function getCompoundCells(compound: Compound): string[] {
  const keys: string[] = []
  for (let dx = 0; dx < compound.w; dx++) {
    for (let dy = 0; dy < compound.h; dy++) {
      keys.push(cellKey(compound.cx + dx, compound.cy + dy))
    }
  }
  return keys
}

const RECT_ORDER: [number, number][] = [
  [3, 3], [3, 2], [2, 3], [2, 2],
  [3, 1], [1, 3], [2, 1], [1, 2],
  [1, 1],
]

/**
 * Extract Compounds from building cells.
 * Deterministic: same buildingCells + seedKey => same compounds.
 * Tries larger rectangles first; reserves one 2×2 as landmark in larger districts.
 */
export function extractCompounds(
  buildingCells: [number, number][],
  territory: [number, number][],
  _seedKey: string,
  isPrimary: boolean
): Compound[] {
  const cellSet = new Set(buildingCells.map(([cx, cy]) => cellKey(cx, cy)))
  const used = new Set<string>()
  const compounds: Compound[] = []

  const landmarkThreshold = territory.length >= 25 ? 1 : 0
  let landmarkPlaced = false

  const tryRect = (w: number, h: number) => (cx: number, cy: number): boolean => {
    for (let dx = 0; dx < w; dx++)
      for (let dy = 0; dy < h; dy++)
        if (!cellSet.has(cellKey(cx + dx, cy + dy))) return false
    for (let dx = 0; dx < w; dx++)
      for (let dy = 0; dy < h; dy++)
        used.add(cellKey(cx + dx, cy + dy))
    return true
  }

  for (const [cx, cy] of buildingCells) {
    if (used.has(cellKey(cx, cy))) continue
    if (landmarkThreshold && !landmarkPlaced && (isPrimary || territory.length >= 40)) {
      if (tryRect(2, 2)(cx, cy)) {
        compounds.push({ cx, cy, w: 2, h: 2, isLandmark: true })
        landmarkPlaced = true
        continue
      }
    }
    for (const [w, h] of RECT_ORDER) {
      if (tryRect(w, h)(cx, cy)) {
        compounds.push({ cx, cy, w, h })
        break
      }
    }
    if (!used.has(cellKey(cx, cy))) {
      used.add(cellKey(cx, cy))
      compounds.push({ cx, cy, w: 1, h: 1 })
    }
  }
  return compounds
}
