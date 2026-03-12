import { hashSeed, seeded, seededUnit } from './seed'
import type { DistrictPlacement } from './scene'

/** Block in world coordinates (top-left, size). Optional shade 0..1 for slight variation. */
export interface DistrictBlock {
  x: number
  y: number
  width: number
  height: number
  shade?: number
}

/** Local grid cell (row, col) in district space. Grid is centered at (0,0). */
interface GridCell {
  row: number
  col: number
}

const GRID_HALF = 4 // cells -4..4 → 9x9
const CELL_SIZE = 10 // base px per cell; scaled by district radius

/** Tier → [min, max] block count. */
const BLOCK_COUNT_BY_TIER: [number, number][] = [
  [0, 2],   // tier 0
  [4, 6],   // tier 1
  [8, 12],  // tier 2
  [14, 20], // tier 3
  [24, 32], // tier 4
  [36, 50], // tier 5
]

/** Return deterministic block count for a district. sector_tier is main driver; xp_share nudges within range. */
export function getBlockCount(tier: number, xpShare: number, seedKey: string): number {
  const [minCount, maxCount] = BLOCK_COUNT_BY_TIER[Math.min(tier, 5)] ?? [4, 6]
  if (minCount === 0 && maxCount <= 2) {
    const n = Math.floor(seeded(seedKey, 'bc') * 3)
    return n
  }
  const span = maxCount - minCount + 1
  let offset = Math.floor(seeded(seedKey, 'bc') * span)
  if (span > 1 && xpShare > 0.5) offset = Math.min(offset + 1, span - 1)
  return minCount + offset
}

export type DistrictPattern = 'courtyard' | 'staggered_grid'

/** Deterministic pattern selection from seed_key. */
export function getPatternFromSeed(seedKey: string): DistrictPattern {
  const h = hashSeed(seedKey + ':pattern')
  const patterns: DistrictPattern[] = ['courtyard', 'staggered_grid']
  return patterns[h % 2]
}

/** All cells in grid order (row then col). */
function allCells(): GridCell[] {
  const out: GridCell[] = []
  for (let r = -GRID_HALF; r <= GRID_HALF; r++) {
    for (let c = -GRID_HALF; c <= GRID_HALF; c++) out.push({ row: r, col: c })
  }
  return out
}

/** Courtyard: blocks around a central empty space. Candidates = cells not in center 3x3; order by distance; take first n. */
function layoutCourtyard(blockCount: number, _seedKey: string): GridCell[] {
  const center = 1
  const candidates = allCells().filter(
    (cell) => Math.abs(cell.row) > center || Math.abs(cell.col) > center
  )
  candidates.sort((a, b) => {
    const da = Math.abs(a.row) + Math.abs(a.col)
    const db = Math.abs(b.row) + Math.abs(b.col)
    if (da !== db) return da - db
    if (a.row !== b.row) return a.row - b.row
    return a.col - b.col
  })
  return candidates.slice(0, blockCount)
}

/** Staggered grid: checkerboard-like; even (row+col), then take first n. */
function layoutStaggeredGrid(blockCount: number, _seedKey: string): GridCell[] {
  const candidates = allCells().filter((cell) => (cell.row + cell.col) % 2 === 0)
  candidates.sort((a, b) => (a.row - b.row) || (a.col - b.col))
  return candidates.slice(0, blockCount)
}

function getLayout(pattern: DistrictPattern, blockCount: number, seedKey: string): GridCell[] {
  switch (pattern) {
    case 'courtyard':
      return layoutCourtyard(blockCount, seedKey)
    case 'staggered_grid':
      return layoutStaggeredGrid(blockCount, seedKey)
    default:
      return layoutCourtyard(blockCount, seedKey)
  }
}

/** Scale so cluster fits within district radius; return world-size per cell. */
function scaleToRadius(radius: number): number {
  const halfExtent = (GRID_HALF + 0.5) * CELL_SIZE
  const scale = radius / halfExtent
  return Math.max(4, Math.min(CELL_SIZE * 1.2, CELL_SIZE * scale))
}

/** Build world-coordinate blocks for one district. Anchor and radius from placement; pattern and count from seed + tier. */
export function buildDistrictBlocks(placement: DistrictPlacement): DistrictBlock[] {
  const { language, x: anchorX, y: anchorY, radius } = placement
  const { sector_tier, xp_share, seed_key } = language
  const blockCount = getBlockCount(sector_tier, xp_share, seed_key)
  if (blockCount <= 0) return []
  const pattern = getPatternFromSeed(seed_key)
  const cells = getLayout(pattern, blockCount, seed_key)
  const worldCellSize = scaleToRadius(radius)
  const gap = 1
  const blockSize = Math.max(4, worldCellSize - gap)
  const blocks: DistrictBlock[] = []
  cells.forEach((cell, i) => {
    const cx = anchorX + cell.col * worldCellSize
    const cy = anchorY + cell.row * worldCellSize
    const shade = 0.9 + seededUnit(hashSeed(seed_key + ':' + i)) * 0.15
    blocks.push({
      x: cx - blockSize / 2,
      y: cy - blockSize / 2,
      width: blockSize,
      height: blockSize,
      shade,
    })
  })
  return blocks
}
