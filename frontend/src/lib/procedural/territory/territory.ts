/**
 * Stage B: Territory generation.
 * Territory – The set of cells belonging to a district.
 * Defines where that district is allowed to build. Roads do NOT affect this step.
 */

import { createSeededNoise } from '../noise'
import { hashSeed, seeded, seededUnit } from '../seed'
import { cellKey, GRID_SIZE, worldToCell } from '../grid'
import { PARCEL_SHAPES } from './parcels'

const CARDINAL = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const
const TERRITORY_NOISE_SCALE = 0.22

/** Guaranteed minimum cells per district by tier. */
export const MIN_TERRITORY_BY_TIER: number[] = [2, 3, 6, 10, 16, 24]

const MAX_TERRITORY_BY_TIER: number[] = [4, 9, 18, 30, 46, 70]

/** Deterministic cell budget for a district (legacy; used when block plan unavailable). */
export function getTerritoryBudget(tier: number, xpShare: number, seedKey: string): number {
  const t = Math.max(0, Math.min(5, tier))
  const minB = MIN_TERRITORY_BY_TIER[t]
  const maxB = MAX_TERRITORY_BY_TIER[t]
  const span = maxB - minB + 1
  let offset = Math.floor(seeded(seedKey, 'tb') * span)
  if (span > 1 && xpShare > 0.6) offset = Math.min(offset + 1, span - 1)
  return minB + offset
}

/** Cells per compound (average footprint). */
const CELLS_PER_COMPOUND = 4

/** Lane cells between blocks. */
const LANE_CELLS_PER_CONNECTION = 1

/** Margin factor so envelope extends beyond block layout (2.2 = 120% extra for irregular shapes). */
const TERRITORY_MARGIN = 2.2

/**
 * Territory budget to fit block plan. Sized from compound count and block grouping.
 * NOT the source of compound count; supports the block plan.
 */
export function getTerritoryBudgetForBlocks(blockSizes: number[], seedKey: string): number {
  if (blockSizes.length === 0) return 4
  const buildingCells = blockSizes.reduce((s, n) => s + n * CELLS_PER_COMPOUND, 0)
  const laneCells = Math.max(0, blockSizes.length - 1) * LANE_CELLS_PER_CONNECTION
  const raw = Math.ceil((buildingCells + laneCells) * TERRITORY_MARGIN)
  const tie = Math.floor(seeded(seedKey, 'tbfb') * 3)
  return Math.max(4, raw + tie)
}

function countTerritoryNeighbors(cx: number, cy: number, territorySet: Set<string>): number {
  let n = 0
  for (const [dx, dy] of CARDINAL) {
    if (territorySet.has(cellKey(cx + dx, cy + dy))) n++
  }
  return n
}

function orthogonalBonus(cx: number, cy: number, acx: number, acy: number): number {
  return (cx === acx || cy === acy) ? 1 : 0
}

function edgeContinuationScore(cx: number, cy: number, territorySet: Set<string>): number {
  const n = countTerritoryNeighbors(cx, cy, territorySet)
  if (n < 2) return 0
  const hasHorz = territorySet.has(cellKey(cx - 1, cy)) || territorySet.has(cellKey(cx + 1, cy))
  const hasVert = territorySet.has(cellKey(cx, cy - 1)) || territorySet.has(cellKey(cx, cy + 1))
  return (hasHorz && hasVert) ? 1 : 2
}

const WEIGHT_EDGE = 3
const WEIGHT_ORTH = 2
const WEIGHT_NOISE = 1

/**
 * Grow territory from anchor using orthogonal, parcel-biased expansion.
 * Roads do NOT affect this. Same seed_key => same territory.
 */
export function growTerritory(
  anchorX: number,
  anchorY: number,
  budget: number,
  occupied: Set<string>,
  seedKey: string,
  protectedCells?: Set<string>
): [number, number][] {
  const [acx, acy] = worldToCell(anchorX, anchorY)
  const protectedSet = protectedCells ?? new Set<string>()
  const noise = createSeededNoise(seedKey)
  const territorySet = new Set<string>()
  const out: [number, number][] = []

  const isUnavailable = (cx: number, cy: number) =>
    occupied.has(cellKey(cx, cy)) || protectedSet.has(cellKey(cx, cy))

  const addCell = (cx: number, cy: number) => {
    const key = cellKey(cx, cy)
    if (territorySet.has(key) || occupied.has(key) || protectedSet.has(key)) return false
    if (cx < 0 || cx >= GRID_SIZE || cy < 0 || cy >= GRID_SIZE) return false
    territorySet.add(key)
    occupied.add(key)
    out.push([cx, cy])
    return true
  }

  addCell(acx, acy)

  while (out.length < budget) {
    const frontier: [number, number][] = []
    for (const [cx, cy] of out) {
      for (const [dx, dy] of CARDINAL) {
        const nx = cx + dx
        const ny = cy + dy
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue
        const key = cellKey(nx, ny)
        if (!territorySet.has(key) && !isUnavailable(nx, ny)) frontier.push([nx, ny])
      }
    }
    const seen = new Set<string>()
    const frontierUnique: [number, number][] = []
    for (const [cx, cy] of frontier) {
      const key = cellKey(cx, cy)
      if (seen.has(key)) continue
      seen.add(key)
      frontierUnique.push([cx, cy])
    }

    type Candidate = { cells: [number, number][]; score: number }
    const candidates: Candidate[] = []

    for (const [cx, cy] of frontierUnique) {
      const edgeSc = edgeContinuationScore(cx, cy, territorySet)
      const orthSc = orthogonalBonus(cx, cy, acx, acy)
      const noiseSc = noise.sample(cx * TERRITORY_NOISE_SCALE, cy * TERRITORY_NOISE_SCALE)
      const score = edgeSc * WEIGHT_EDGE + orthSc * WEIGHT_ORTH + noiseSc * WEIGHT_NOISE
      candidates.push({ cells: [[cx, cy]], score })
    }

    const step = out.length
    const useParcel = seededUnit(hashSeed(seedKey + ':parcel:' + step)) < 0.55
    if (useParcel) {
      const shapeIndex = Math.floor(seededUnit(hashSeed(seedKey + ':shape:' + step)) * PARCEL_SHAPES.length) % PARCEL_SHAPES.length
      const shape = PARCEL_SHAPES[shapeIndex]
      for (const [fx, fy] of frontierUnique) {
        for (let o = 0; o < shape.length; o++) {
          const px = fx - shape[o][0]
          const py = fy - shape[o][1]
          const cells: [number, number][] = shape.map(([dx, dy]) => [px + dx, py + dy])
          if (!cells.every(([cx, cy]) => cx >= 0 && cx < GRID_SIZE && cy >= 0 && cy < GRID_SIZE)) continue
          if (!cells.every(([cx, cy]) => !isUnavailable(cx, cy))) continue
          if (!cells.some(([cx, cy]) => countTerritoryNeighbors(cx, cy, territorySet) > 0)) continue
          const avgEdge = cells.reduce((s, [cx, cy]) => s + edgeContinuationScore(cx, cy, territorySet), 0) / cells.length
          const avgOrth = cells.reduce((s, [cx, cy]) => s + orthogonalBonus(cx, cy, acx, acy), 0) / cells.length
          const avgNoise = cells.reduce((s, [cx, cy]) => s + noise.sample(cx * TERRITORY_NOISE_SCALE, cy * TERRITORY_NOISE_SCALE), 0) / cells.length
          const score = avgEdge * WEIGHT_EDGE + avgOrth * WEIGHT_ORTH + avgNoise * WEIGHT_NOISE + 0.5
          candidates.push({ cells, score })
        }
      }
    }

    if (candidates.length === 0) break

    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const tie = hashSeed(seedKey + ':tie:' + step + ':' + a.cells[0][0] + ',' + a.cells[0][1]) - hashSeed(seedKey + ':tie:' + step + ':' + b.cells[0][0] + ',' + b.cells[0][1])
      return tie
    })

    const best = candidates[0]
    let added = 0
    for (const [cx, cy] of best.cells) {
      if (addCell(cx, cy)) added++
    }
    if (added === 0) break
  }

  return out
}

/** Territory border cells (have at least one neighbor outside territory). */
export function getTerritoryBorderCells(territory: [number, number][]): [number, number][] {
  const set = new Set(territory.map(([cx, cy]) => cellKey(cx, cy)))
  const border: [number, number][] = []
  for (const [cx, cy] of territory) {
    const hasOut = !set.has(cellKey(cx - 1, cy)) || !set.has(cellKey(cx + 1, cy)) ||
      !set.has(cellKey(cx, cy - 1)) || !set.has(cellKey(cx, cy + 1))
    if (hasOut) border.push([cx, cy])
  }
  return border
}
