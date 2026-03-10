import { harmonizeBuildingCells } from './harmonize'
import {
  createSeededNoise,
  getParcelFillDecision,
  TERRITORY_NOISE_SCALE,
} from './noise'
import { hashSeed, seeded, seededUnit } from './seed'
import type { DistrictPlacement } from './scene'

/**
 * Campus layout (anchors in scene.ts, territory here):
 * - Anchors: largest district (by sector_tier, then xp_share) at map center; others on a compact ring (orbitRadius 78px). Same seed_key => same angles/positions.
 * - Minimum territory: each district gets at least MIN_TERRITORY_BY_TIER[tier] cells. getTerritoryBudget returns min + stochastic in [min, max].
 * - Territory growth: orthogonal, parcel-biased expansion from anchor (no radial diamond). Only adjacent cells are claimed; 2x1/1x2/2x2/3x2/2x3 parcels used when chosen by seed. Edge continuation and cardinal alignment prioritized; noise biases priority.
 * - Borders: growTerritory consumes a shared occupied set; expansion stops at other districts' cells.
 */

/** Map size must match scene MAP_SIZE. */
export const MAP_SIZE = 840
export const CELL_SIZE = 14
export const GRID_SIZE = Math.floor(MAP_SIZE / CELL_SIZE) // 60

export function worldToCell(worldX: number, worldY: number): [number, number] {
  const cx = Math.floor(worldX / CELL_SIZE)
  const cy = Math.floor(worldY / CELL_SIZE)
  return [
    Math.max(0, Math.min(GRID_SIZE - 1, cx)),
    Math.max(0, Math.min(GRID_SIZE - 1, cy)),
  ]
}

export function cellToWorld(cx: number, cy: number): [number, number] {
  return [cx * CELL_SIZE + CELL_SIZE / 2, cy * CELL_SIZE + CELL_SIZE / 2]
}

export function cellKey(cx: number, cy: number): string {
  return `${cx},${cy}`
}

/** Guaranteed minimum cells per district by tier (always allocated before stochastic expansion). */
export const MIN_TERRITORY_BY_TIER: number[] = [2, 3, 6, 10, 16, 24]

/** Max territory cap by tier; budget is min + stochastic in [min, max]. */
const MAX_TERRITORY_BY_TIER: number[] = [4, 9, 18, 30, 46, 70]

export function getTerritoryBudget(tier: number, xpShare: number, seedKey: string): number {
  const t = Math.max(0, Math.min(5, tier))
  const minB = MIN_TERRITORY_BY_TIER[t]
  const maxB = MAX_TERRITORY_BY_TIER[t]
  const span = maxB - minB + 1
  let offset = Math.floor(seeded(seedKey, 'tb') * span)
  if (span > 1 && xpShare > 0.6) offset = Math.min(offset + 1, span - 1)
  return minB + offset
}

/** Parcel shapes: [dx, dy] relative to top-left. Used for block-like territory growth. */
const PARCEL_SHAPES: [number, number][][] = [
  [[0, 0], [1, 0]],           // 2x1
  [[0, 0], [0, 1]],           // 1x2
  [[0, 0], [1, 0], [0, 1], [1, 1]], // 2x2
  [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]], // 3x2
  [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]], // 2x3
]

/** Neighbors (cardinal only) for frontier checks. */
const CARDINAL = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const

function countTerritoryNeighbors(cx: number, cy: number, territorySet: Set<string>): number {
  let n = 0
  for (const [dx, dy] of CARDINAL) {
    if (territorySet.has(cellKey(cx + dx, cy + dy))) n++
  }
  return n
}

/** Orthogonal bonus: 1 if (cx,cy) is in same row or same column as anchor (cardinal alignment). */
function orthogonalBonus(cx: number, cy: number, acx: number, acy: number): number {
  return (cx === acx || cy === acy) ? 1 : 0
}

/** Edge continuation score: prefer cells that extend a straight line (2+ neighbors in same row or col). */
function edgeContinuationScore(cx: number, cy: number, territorySet: Set<string>): number {
  const n = countTerritoryNeighbors(cx, cy, territorySet)
  if (n < 2) return 0
  const hasHorz = territorySet.has(cellKey(cx - 1, cy)) || territorySet.has(cellKey(cx + 1, cy))
  const hasVert = territorySet.has(cellKey(cx, cy - 1)) || territorySet.has(cellKey(cx, cy + 1))
  return (hasHorz && hasVert) ? 1 : 2
}

/**
 * Grow territory from anchor using orthogonal, parcel-biased expansion.
 * - Expands only into cells adjacent to current territory (no radial diamond).
 * - Prefers cardinal directions and straight-edge continuation.
 * - May claim 2x1, 1x2, 2x2, 3x2, 2x3 parcels; parcel choice deterministic from seed_key.
 * - protectedCells: other districts' anchor cells; this district must not claim them.
 * Same seed_key => same territory.
 */
export function growTerritory(
  anchorX: number,
  anchorY: number,
  budget: number,
  occupied: Set<string>,
  seedKey: string,
  _tier: number,
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

  const WEIGHT_EDGE = 3
  const WEIGHT_ORTH = 2
  const WEIGHT_NOISE = 1

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
    const useParcel = seededUnit(hashSeed(seedKey + ':parcel:' + step)) < 0.45
    if (useParcel) {
      const shapeIndex = Math.floor(seededUnit(hashSeed(seedKey + ':shape:' + step)) * PARCEL_SHAPES.length) % PARCEL_SHAPES.length
      const shape = PARCEL_SHAPES[shapeIndex]
      for (const [fx, fy] of frontierUnique) {
        for (let o = 0; o < shape.length; o++) {
          const px = fx - shape[o][0]
          const py = fy - shape[o][1]
          const cells: [number, number][] = shape.map(([dx, dy]) => [px + dx, py + dy])
          const allInBounds = cells.every(([cx, cy]) => cx >= 0 && cx < GRID_SIZE && cy >= 0 && cy < GRID_SIZE)
          if (!allInBounds) continue
          const allFree = cells.every(([cx, cy]) => !isUnavailable(cx, cy))
          if (!allFree) continue
          const anyAdjacent = cells.some(([cx, cy]) => countTerritoryNeighbors(cx, cy, territorySet) > 0)
          if (!anyAdjacent) continue
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

// --- Motifs: relative cell offsets from origin (0,0). Origin is included. ---
export type MotifId =
  | 'courtyard_cluster'
  | 'staggered_row'
  | 'paired_blocks'
  | 'utility_corner'
  | 'service_strip'
  | 'landmark_pad'

/** [dc, dr] relative to origin (0,0). */
const MOTIFS: Record<MotifId, [number, number][]> = {
  courtyard_cluster: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]],
  staggered_row: [[0, 0], [1, 0], [2, 1]],
  paired_blocks: [[0, 0], [1, 0]],
  utility_corner: [[0, 0], [1, 0], [0, 1]],
  service_strip: [[0, 0], [0, 1], [0, 2]],
  landmark_pad: [[0, 0], [1, 0], [0, 1], [1, 1]],
}

const MOTIF_IDS: MotifId[] = ['courtyard_cluster', 'staggered_row', 'paired_blocks', 'utility_corner', 'service_strip', 'landmark_pad']

function getMotifAt(seedKey: string, index: number): MotifId {
  const h = hashSeed(seedKey + ':m' + index)
  return MOTIF_IDS[h % MOTIF_IDS.length]
}

/** District block in world coords. type hints 1x1, 2x1, 2x2 for rendering. */
export interface WorldBlock {
  x: number
  y: number
  w: number
  h: number
  shade: number
  isLandmark?: boolean
}

/** Fill territory with motifs; noise biases placement order and creates empty pockets (low-noise cells skipped as origins). */
function fillTerritoryWithMotifs(
  territory: [number, number][],
  seedKey: string,
  isPrimary: boolean
): WorldBlock[] {
  const cellSet = new Set(territory.map(([cx, cy]) => cellKey(cx, cy)))
  const used = new Set<string>()
  const buildingCells: [number, number][] = []
  const noise = createSeededNoise(seedKey + ':fill')
  const fillRatio = 0.58 + seeded(seedKey, 'fill') * 0.2

  const tryPlace = (originCx: number, originCy: number, motif: MotifId): boolean => {
    const rel = MOTIFS[motif]
    const cells: [number, number][] = rel.map(([dc, dr]) => [originCx + dc, originCy + dr])
    const allIn = cells.every(([cx, cy]) => cellSet.has(cellKey(cx, cy)))
    const allFree = cells.every(([cx, cy]) => !used.has(cellKey(cx, cy)))
    if (!allIn || !allFree) return false
    cells.forEach(([cx, cy]) => used.add(cellKey(cx, cy)))
    buildingCells.push(...cells)
    return true
  }

  // Order by noise descending: try high-noise cells first (denser parcels), low-noise stay as gaps
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
    const motif = getMotifAt(seedKey, placed)
    if (motif === 'landmark_pad' && (!isPrimary || territory.length < 20)) continue
    if (tryPlace(cx, cy, motif)) placed++
  }

  // Fallback: if noise rejected every cell (e.g. small district with low noise), place at least some blocks so district is visible
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
      const motif = getMotifAt(seedKey, i)
      if (motif === 'landmark_pad' && (!isPrimary || territory.length < 20)) continue
      tryPlace(cx, cy, motif)
    }
  }

  // Post-process: merge fragments into orthogonal compounds, reduce noise, preserve intentional gaps (deterministic).
  const harmonizedCells = harmonizeBuildingCells(buildingCells, territory, seedKey)
  return cellsToBlocks(harmonizedCells, territory, seedKey, isPrimary)
}

/** Convert building cells to world blocks (1x1, 2x1, 2x2). Reserve one 2x2 as landmark in larger districts. */
function cellsToBlocks(
  cells: [number, number][],
  territory: [number, number][],
  seedKey: string,
  isPrimary: boolean
): WorldBlock[] {
  const cellSet = new Set(cells.map(([cx, cy]) => cellKey(cx, cy)))
  const used = new Set<string>()
  const blocks: WorldBlock[] = []
  const gap = 1

  const landmarkThreshold = territory.length >= 25 ? 1 : 0
  let landmarkPlaced = false

  const try2x2 = (cx: number, cy: number): boolean => {
    for (let dx = 0; dx <= 1; dx++)
      for (let dy = 0; dy <= 1; dy++)
        if (!cellSet.has(cellKey(cx + dx, cy + dy))) return false
    for (let dx = 0; dx <= 1; dx++)
      for (let dy = 0; dy <= 1; dy++)
        used.add(cellKey(cx + dx, cy + dy))
    return true
  }

  const try2x1 = (cx: number, cy: number, horizontal: boolean): boolean => {
    const c2 = horizontal ? [cx + 1, cy] : [cx, cy + 1]
    if (!cellSet.has(cellKey(c2[0], c2[1]))) return false
    if (used.has(cellKey(cx, cy)) || used.has(cellKey(c2[0], c2[1]))) return false
    used.add(cellKey(cx, cy))
    used.add(cellKey(c2[0], c2[1]))
    return true
  }

  const topLeft = (cx: number, cy: number) => [cx * CELL_SIZE + gap / 2, cy * CELL_SIZE + gap / 2]
  const cellW = CELL_SIZE - gap

  for (const [cx, cy] of cells) {
    if (used.has(cellKey(cx, cy))) continue
    if (landmarkThreshold && !landmarkPlaced && (isPrimary || territory.length >= 40)) {
      if (try2x2(cx, cy)) {
        const [x, y] = topLeft(cx, cy)
        blocks.push({
          x,
          y,
          w: CELL_SIZE * 2 - gap,
          h: CELL_SIZE * 2 - gap,
          shade: 0.95,
          isLandmark: true,
        })
        landmarkPlaced = true
        continue
      }
    }
    if (seededUnit(hashSeed(seedKey + ':' + cx + ',' + cy)) > 0.5) {
      if (try2x1(cx, cy, true)) {
        const [x, y] = topLeft(cx, cy)
        blocks.push({
          x,
          y,
          w: CELL_SIZE * 2 - gap,
          h: cellW,
          shade: 0.9 + seededUnit(hashSeed(seedKey + 'b' + cx)) * 0.12,
        })
        continue
      }
      if (try2x1(cx, cy, false)) {
        const [x, y] = topLeft(cx, cy)
        blocks.push({
          x,
          y,
          w: cellW,
          h: CELL_SIZE * 2 - gap,
          shade: 0.9 + seededUnit(hashSeed(seedKey + 'b' + cy)) * 0.12,
        })
        continue
      }
    }
    used.add(cellKey(cx, cy))
    const [x, y] = topLeft(cx, cy)
    blocks.push({
      x,
      y,
      w: cellW,
      h: cellW,
      shade: 0.88 + seededUnit(hashSeed(seedKey + 's' + cx + cy)) * 0.18,
    })
  }
  return blocks
}

/** Cells that lie on the boundary of a territory (have at least one neighbor outside the territory). */
export function getTerritoryBorderCells(territory: [number, number][]): [number, number][] {
  const set = new Set(territory.map(([cx, cy]) => cellKey(cx, cy)))
  const border: [number, number][] = []
  for (const [cx, cy] of territory) {
    const hasOutNeighbor =
      !set.has(cellKey(cx - 1, cy)) ||
      !set.has(cellKey(cx + 1, cy)) ||
      !set.has(cellKey(cx, cy - 1)) ||
      !set.has(cellKey(cx, cy + 1))
    if (hasOutNeighbor) border.push([cx, cy])
  }
  return border
}

export interface DistrictBuildResult {
  blockLists: WorldBlock[][]
  borderCellsByDistrict: [number, number][][]
}

/** Build blocks and border cells for all districts. Territory allocated biggest-budget-first; other districts' anchors are protected so no district steals another's anchor. */
export function buildAllDistrictBlocks(placements: DistrictPlacement[]): DistrictBuildResult {
  const occupied = new Set<string>()
  const anchorCellsByIndex = placements.map((d) => cellKey(...worldToCell(d.x, d.y)))
  const budgets = placements.map((d) => getTerritoryBudget(d.language.sector_tier, d.language.xp_share, d.language.seed_key))
  const byBudgetDesc = placements.map((_, i) => i).sort((a, b) => budgets[b] - budgets[a] || a - b)
  const territoryByIndex: [number, number][][] = []
  for (let i = 0; i < placements.length; i++) territoryByIndex.push([])
  for (const i of byBudgetDesc) {
    const d = placements[i]
    const { sector_tier, seed_key } = d.language
    const budget = budgets[i]
    const protectedCells = new Set<string>()
    for (let j = 0; j < placements.length; j++) if (j !== i) protectedCells.add(anchorCellsByIndex[j])
    const territory = growTerritory(d.x, d.y, budget, occupied, seed_key, sector_tier, protectedCells)
    territoryByIndex[i] = territory
  }
  const anchorIndex = 0
  const blockLists = territoryByIndex.map((territory, i) =>
    fillTerritoryWithMotifs(territory, placements[i].language.seed_key, i === anchorIndex)
  )
  const borderCellsByDistrict = territoryByIndex.map((t) => getTerritoryBorderCells(t))
  return { blockLists, borderCellsByDistrict }
}
