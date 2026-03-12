/**
 * Stage C: Compound layout.
 * Split district mass into multiple rectangular Compounds.
 * Compounds are compact and campus-like; preserve target block count.
 * Roads do NOT affect this step.
 */

import { createSeededNoise } from '../noise'
import { getParcelFillDecision } from '../noise'
import { hashSeed, seeded, seededUnit } from '../seed'
import { cellKey } from '../grid'
import { COMPOUND_SHAPES, COMPOUND_SHAPE_IDS, type CompoundShapeId } from './compoundShapes'
import { harmonizeCompoundCells } from './compoundHarmonize'

/**
 * Place compounds in territory. Returns building cells (compound occupancy).
 * Deterministic from seedKey and territory.
 */
export function layoutCompoundsInTerritory(
  territory: [number, number][],
  seedKey: string,
  isPrimary: boolean
): [number, number][] {
  const cellSet = new Set(territory.map(([cx, cy]) => cellKey(cx, cy)))
  const used = new Set<string>()
  const buildingCells: [number, number][] = []
  const noise = createSeededNoise(seedKey + ':fill')
  const fillRatio = 0.58 + seeded(seedKey, 'fill') * 0.2

  const tryPlace = (originCx: number, originCy: number, shapeId: CompoundShapeId): boolean => {
    const rel = COMPOUND_SHAPES[shapeId]
    const cells: [number, number][] = rel.map(([dc, dr]) => [originCx + dc, originCy + dr])
    const allIn = cells.every(([cx, cy]) => cellSet.has(cellKey(cx, cy)))
    const allFree = cells.every(([cx, cy]) => !used.has(cellKey(cx, cy)))
    if (!allIn || !allFree) return false
    cells.forEach(([cx, cy]) => used.add(cellKey(cx, cy)))
    buildingCells.push(...cells)
    return true
  }

  const getShapeAt = (index: number): CompoundShapeId => {
    const h = hashSeed(seedKey + ':m' + index)
    return COMPOUND_SHAPE_IDS[h % COMPOUND_SHAPE_IDS.length]
  }

  const order = [...territory].sort((a, b) => {
    const na = noise.sample(a[0] * 0.2, a[1] * 0.2)
    const nb = noise.sample(b[0] * 0.2, b[1] * 0.2)
    return nb - na
  })

  const targetFill = Math.floor(territory.length * fillRatio)
  let placed = 0
  let attempts = 0
  const maxAttempts = territory.length * 5
  while (buildingCells.length < targetFill && attempts < maxAttempts) {
    attempts++
    const idx = Math.floor(seededUnit(hashSeed(seedKey + 'attempt' + attempts)) * order.length)
    const [cx, cy] = order[idx]
    if (used.has(cellKey(cx, cy))) continue
    if (!getParcelFillDecision(noise.sample(cx * 0.25, cy * 0.25))) continue
    const shapeId = getShapeAt(placed)
    if (shapeId === 'landmark_pad' && (!isPrimary || territory.length < 20)) continue
    if (tryPlace(cx, cy, shapeId)) placed++
  }

  if (buildingCells.length === 0 && territory.length > 0) {
    const origin = territory[0]
    const byDist = [...territory].sort((a, b) => {
      const da = Math.abs(a[0] - origin[0]) + Math.abs(a[1] - origin[1])
      const db = Math.abs(b[0] - origin[0]) + Math.abs(b[1] - origin[1])
      return da - db
    })
    for (let i = 0; i < byDist.length && buildingCells.length < Math.max(3, Math.floor(byDist.length * 0.4)); i++) {
      const [cx, cy] = byDist[i]
      if (used.has(cellKey(cx, cy))) continue
      const shapeId = getShapeAt(i)
      if (shapeId === 'landmark_pad' && (!isPrimary || territory.length < 20)) continue
      tryPlace(cx, cy, shapeId)
    }
  }

  return harmonizeCompoundCells(buildingCells, territory, seedKey)
}
