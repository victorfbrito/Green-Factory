/**
 * Stage D: Building layer.
 * Block – The thing drawn for a compound: one rectangle in world coords.
 * Compounds and blocks are 1:1 (one compound → one block).
 */

import { hashSeed, seededUnit } from '../seed'
import { CELL_SIZE, cellKey } from '../grid'

export interface Block {
  x: number
  y: number
  w: number
  h: number
  shade: number
  isLandmark?: boolean
}

const gap = 1
const cellW = CELL_SIZE - gap
const rectW = (n: number) => CELL_SIZE * n - gap

const topLeft = (cx: number, cy: number) => [cx * CELL_SIZE + gap / 2, cy * CELL_SIZE + gap / 2]

/**
 * Convert compound cells to draw-ready Blocks.
 * Rectangles only: 2x1, 2x2, 3x1, 3x2, 3x3. Reserve one 2x2 as landmark in larger districts.
 */
export function compoundsToBlocks(
  buildingCells: [number, number][],
  territory: [number, number][],
  seedKey: string,
  isPrimary: boolean
): Block[] {
  const cellSet = new Set(buildingCells.map(([cx, cy]) => cellKey(cx, cy)))
  const used = new Set<string>()
  const blocks: Block[] = []

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
        const [x, y] = topLeft(cx, cy)
        blocks.push({ x, y, w: rectW(2), h: rectW(2), shade: 0.95, isLandmark: true })
        landmarkPlaced = true
        continue
      }
    }
    const r = seededUnit(hashSeed(seedKey + ':' + cx + ',' + cy))
    if (tryRect(3, 3)(cx, cy)) {
      const [x, y] = topLeft(cx, cy)
      blocks.push({ x, y, w: rectW(3), h: rectW(3), shade: 0.9 + r * 0.12 })
      continue
    }
    if (tryRect(3, 2)(cx, cy)) {
      const [x, y] = topLeft(cx, cy)
      blocks.push({ x, y, w: rectW(3), h: rectW(2), shade: 0.9 + r * 0.12 })
      continue
    }
    if (tryRect(2, 3)(cx, cy)) {
      const [x, y] = topLeft(cx, cy)
      blocks.push({ x, y, w: rectW(2), h: rectW(3), shade: 0.9 + r * 0.12 })
      continue
    }
    if (tryRect(2, 2)(cx, cy)) {
      const [x, y] = topLeft(cx, cy)
      blocks.push({ x, y, w: rectW(2), h: rectW(2), shade: 0.9 + r * 0.12 })
      continue
    }
    if (tryRect(3, 1)(cx, cy)) {
      const [x, y] = topLeft(cx, cy)
      blocks.push({ x, y, w: rectW(3), h: cellW, shade: 0.9 + r * 0.12 })
      continue
    }
    if (tryRect(1, 3)(cx, cy)) {
      const [x, y] = topLeft(cx, cy)
      blocks.push({ x, y, w: cellW, h: rectW(3), shade: 0.9 + r * 0.12 })
      continue
    }
    if (tryRect(2, 1)(cx, cy)) {
      const [x, y] = topLeft(cx, cy)
      blocks.push({ x, y, w: rectW(2), h: cellW, shade: 0.9 + r * 0.12 })
      continue
    }
    if (tryRect(1, 2)(cx, cy)) {
      const [x, y] = topLeft(cx, cy)
      blocks.push({ x, y, w: cellW, h: rectW(2), shade: 0.9 + r * 0.12 })
      continue
    }
    used.add(cellKey(cx, cy))
    const [x, y] = topLeft(cx, cy)
    blocks.push({ x, y, w: cellW, h: cellW, shade: 0.88 + r * 0.18 })
  }
  return blocks
}
