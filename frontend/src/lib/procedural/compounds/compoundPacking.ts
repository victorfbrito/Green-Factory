/**
 * Pack compounds inside a block footprint. No overlap.
 * Each compound claims unique cells. Deterministic from seed_key.
 */

import { hashSeed, seededUnit } from '../seed'
import { cellKey } from '../grid'
import type { Compound } from './compoundExtract'
import type { BlockFootprint } from '../blocks/blockPlacement'

const RECT_ORDER: [number, number][] = [
  [2, 2], [3, 2], [2, 3], [3, 3],
  [2, 1], [1, 2], [3, 1], [1, 3],
  [1, 1],
]

function getFootprintCells(fp: BlockFootprint): Set<string> {
  const out = new Set<string>()
  for (let dx = 0; dx < fp.w; dx++) {
    for (let dy = 0; dy < fp.h; dy++) {
      out.add(cellKey(fp.cx + dx, fp.cy + dy))
    }
  }
  return out
}

function tryPlaceCompound(
  cx: number,
  cy: number,
  w: number,
  h: number,
  available: Set<string>
): boolean {
  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < h; dy++) {
      if (!available.has(cellKey(cx + dx, cy + dy))) return false
    }
  }
  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < h; dy++) {
      available.delete(cellKey(cx + dx, cy + dy))
    }
  }
  return true
}

/**
 * Pack compounds inside a block footprint. Target count from language-derived block plan.
 * No overlap. Capacity check: footprint must fit targetCount (else pack what fits).
 * Deterministic: same footprint + seedKey + targetCount => same compounds.
 */
export function packCompoundsInBlock(
  footprint: BlockFootprint,
  targetCount: number,
  seedKey: string,
  blockIndex: number,
  isPrimary: boolean
): Compound[] {
  const available = getFootprintCells(footprint)
  const capacity = Math.max(1, Math.floor(available.size / 3))
  const maxCompounds = Math.min(targetCount, capacity)
  const compounds: Compound[] = []

  const order: [number, number][] = []
  for (let dx = 0; dx < footprint.w; dx++) {
    for (let dy = 0; dy < footprint.h; dy++) {
      order.push([footprint.cx + dx, footprint.cy + dy])
    }
  }
  order.sort((a, b) => {
    const tie = seededUnit(hashSeed(seedKey + ':order:' + blockIndex + ':' + a[0] + ',' + a[1])) -
      seededUnit(hashSeed(seedKey + ':order:' + blockIndex + ':' + b[0] + ',' + b[1]))
    return tie
  })

  let placed = 0
  const landmarkThreshold = available.size >= 6 && isPrimary ? 1 : 0
  let landmarkPlaced = false

  for (const [cx, cy] of order) {
    if (placed >= maxCompounds) break
    if (!available.has(cellKey(cx, cy))) continue

    if (landmarkThreshold && !landmarkPlaced) {
      if (tryPlaceCompound(cx, cy, 2, 2, available)) {
        compounds.push({ cx, cy, w: 2, h: 2, isLandmark: true })
        landmarkPlaced = true
        placed++
        continue
      }
    }

    const shapeIdx = (placed + blockIndex * 4) % RECT_ORDER.length
    const [w, h] = RECT_ORDER[shapeIdx]
    if (w === 2 && h === 2 && landmarkPlaced) continue

    if (tryPlaceCompound(cx, cy, w, h, available)) {
      compounds.push({ cx, cy, w, h })
      placed++
      continue
    }

    for (const [rw, rh] of RECT_ORDER) {
      if (rw === 2 && rh === 2 && landmarkPlaced) continue
      if (tryPlaceCompound(cx, cy, rw, rh, available)) {
        compounds.push({ cx, cy, w: rw, h: rh })
        placed++
        break
      }
    }
  }

  if (compounds.length === 0 && available.size > 0) {
    const first = order.find(([cx, cy]) => available.has(cellKey(cx, cy)))
    if (first) {
      const [cx, cy] = first
      available.delete(cellKey(cx, cy))
      compounds.push({ cx, cy, w: 1, h: 1 })
    }
  }

  return compounds
}
