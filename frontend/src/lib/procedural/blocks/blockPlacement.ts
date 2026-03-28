/**
 * Block-first placement: place blocks as connected nodes with 1-cell lanes between.
 * Blocks never overlap. Blocks never touch (1-cell lane separation).
 * Territory is derived FROM placement (compound-driven), not the other way around.
 * Deterministic from seed_key.
 */

import { hashSeed, seededUnit } from '../seed'
import { cellKey, GRID_SIZE } from '../grid'

export interface BlockFootprint {
  cx: number
  cy: number
  w: number
  h: number
}

export interface BlockPlacementResult {
  footprints: BlockFootprint[]
  /** Lane cells connecting blocks (1-cell gaps between blocks) */
  laneCells: { cx: number; cy: number }[]
  /** For each block index > 0: which block it connects to, and the lane cell */
  connections: { fromBlock: number; toBlock: number; laneCell: { cx: number; cy: number } }[]
  /** Territory = blocks + lanes (derived from placement, compound-driven) */
  territoryCells: [number, number][]
}

const BLOCK_SIZES: [number, number][] = [
  [3, 6],[3, 5], [3, 4], [3, 3], [3, 2], [3, 1],
  [6, 3],[5, 3], [4, 3], [2, 3], [1, 3],
  [2, 2], [2, 1], [1, 2], [1, 1],
]

/** Minimum footprint dimensions to hold n compounds (~4 cells each). */
function getFootprintSizesForCompoundCount(n: number): [number, number][] {
  const minArea = Math.max(n, 3 * n)
  const valid = BLOCK_SIZES.filter(([w, h]) => w * h >= minArea)
  return valid.length > 0 ? valid : BLOCK_SIZES
}

/** Shuffle sizes by seed so horizontal/vertical varies per block. */
function shuffleSizesBySeed(sizes: [number, number][], seedKey: string, blockIndex: number): [number, number][] {
  return [...sizes].sort((a, b) => {
    const tieA = seededUnit(hashSeed(seedKey + ':size:' + blockIndex + ':' + a[0] + 'x' + a[1]))
    const tieB = seededUnit(hashSeed(seedKey + ':size:' + blockIndex + ':' + b[0] + 'x' + b[1]))
    return tieA - tieB
  })
}

function getFootprintCells(fp: BlockFootprint): string[] {
  const keys: string[] = []
  for (let dx = 0; dx < fp.w; dx++) {
    for (let dy = 0; dy < fp.h; dy++) {
      keys.push(cellKey(fp.cx + dx, fp.cy + dy))
    }
  }
  return keys
}

function getFootprintSet(fp: BlockFootprint): Set<string> {
  return new Set(getFootprintCells(fp))
}

/** Block cells from footprints (for touch-check across districts). */
export function getBlockCellsFromFootprints(footprints: BlockFootprint[]): Set<string> {
  const set = new Set<string>()
  for (const fp of footprints) {
    for (const k of getFootprintCells(fp)) set.add(k)
  }
  return set
}

function footprintInBounds(fp: BlockFootprint): boolean {
  return fp.cx >= 0 && fp.cy >= 0 && fp.cx + fp.w <= GRID_SIZE && fp.cy + fp.h <= GRID_SIZE
}

function footprintOverlapsExclusion(fp: BlockFootprint, excluded: Set<string>): boolean {
  for (const k of getFootprintCells(fp)) {
    if (excluded.has(k)) return true
  }
  return false
}

function isAvailable(cx: number, cy: number, occupied: Set<string>): boolean {
  if (cx < 0 || cx >= GRID_SIZE || cy < 0 || cy >= GRID_SIZE) return false
  return !occupied.has(cellKey(cx, cy))
}

/** 8-direction neighbors (orthogonal + diagonal) */
const NEIGHBORS_8: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1],
]

/** Block + 1-cell buffer (8-neighbors). Used to check new blocks don't touch existing ones. */
function getBlockExclusionZone(fp: BlockFootprint): Set<string> {
  const zone = new Set<string>()
  for (let dx = 0; dx < fp.w; dx++) {
    for (let dy = 0; dy < fp.h; dy++) {
      const cx = fp.cx + dx
      const cy = fp.cy + dy
      zone.add(cellKey(cx, cy))
      for (const [nx, ny] of NEIGHBORS_8) {
        zone.add(cellKey(cx + nx, cy + ny))
      }
    }
  }
  return zone
}

/** True if new block would touch (8-adjacent) any cell in blockCells. */
function footprintTouchesBlocks(fp: BlockFootprint, blockCells: Set<string>): boolean {
  const zone = getBlockExclusionZone(fp)
  for (const k of zone) {
    if (blockCells.has(k)) return true
  }
  return false
}

/** Perimeter cells of a block (1 step away, including diagonal). Lane candidates live here. */
function getPerimeterCells(fp: BlockFootprint): [number, number][] {
  const out: [number, number][] = []
  const blockSet = new Set(getFootprintCells(fp))
  for (let dx = -1; dx <= fp.w; dx++) {
    for (let dy = -1; dy <= fp.h; dy++) {
      const cx = fp.cx + dx
      const cy = fp.cy + dy
      const k = cellKey(cx, cy)
      if (blockSet.has(k)) continue
      const adjacent8 = NEIGHBORS_8.some(([nx, ny]) => blockSet.has(cellKey(cx + nx, cy + ny)))
      if (adjacent8) out.push([cx, cy])
    }
  }
  return out
}

/**
 * Place blocks in a connected graph. Each block connects to a previous block via 1-cell lane.
 * Blocks stay 1 cell apart (including diagonal). Territory expands to fit.
 * blockSizes: compound count per block (from groupCompoundsIntoBlocks).
 */
export function placeBlocks(
  occupied: Set<string>,
  blockCellsFromOthers: Set<string>,
  blockSizes: number[],
  anchorCx: number,
  anchorCy: number,
  seedKey: string
): BlockPlacementResult {
  if (blockSizes.length === 0) {
    return { footprints: [], laneCells: [], connections: [], territoryCells: [] }
  }

  const numBlocks = blockSizes.length
  const footprints: BlockFootprint[] = []
  const laneCells: { cx: number; cy: number }[] = []
  const connections: { fromBlock: number; toBlock: number; laneCell: { cx: number; cy: number } }[] = []
  let excluded = new Set<string>(occupied)
  const blockCells = new Set<string>(blockCellsFromOthers)

  // Candidate cells for primary block: all grid cells by distance from anchor
  const gridCells: [number, number][] = []
  for (let cx = 0; cx < GRID_SIZE; cx++) {
    for (let cy = 0; cy < GRID_SIZE; cy++) {
      gridCells.push([cx, cy])
    }
  }
  const candidatesSorted = gridCells
    .filter(([cx, cy]) => isAvailable(cx, cy, occupied))
    .sort((a, b) => {
      const da = Math.abs(a[0] - anchorCx) + Math.abs(a[1] - anchorCy)
      const db = Math.abs(b[0] - anchorCx) + Math.abs(b[1] - anchorCy)
      if (da !== db) return da - db
      return (a[0] - b[0]) || (a[1] - b[1])
    })

  // 1. Place primary block near anchor (sized for blockSizes[0] compounds)
  const primarySizes = getFootprintSizesForCompoundCount(blockSizes[0])
  const sizes0 = shuffleSizesBySeed(primarySizes.length > 0 ? primarySizes : BLOCK_SIZES, seedKey, 0)
  let placed = false
  for (const [cx, cy] of candidatesSorted) {
    if (placed) break
    for (const [w, h] of sizes0) {
      const fp: BlockFootprint = { cx, cy, w, h }
      if (!footprintInBounds(fp)) continue
      if (footprintOverlapsExclusion(fp, excluded)) continue
      if (footprintTouchesBlocks(fp, blockCells)) continue
      footprints.push(fp)
      excluded = new Set([...excluded, ...getFootprintSet(fp)])
      for (const k of getFootprintCells(fp)) blockCells.add(k)
      placed = true
      break
    }
  }

  if (footprints.length === 0) return { footprints: [], laneCells: [], connections: [], territoryCells: [] }

  // 2. Place additional blocks, each connected via 1-cell lane (sized for blockSizes[b] compounds)
  for (let b = 1; b < numBlocks; b++) {
    const blockSizesForB = getFootprintSizesForCompoundCount(blockSizes[b])
    const sizesB = shuffleSizesBySeed(blockSizesForB.length > 0 ? blockSizesForB : BLOCK_SIZES, seedKey, b)
    const parentIdx = Math.floor(seededUnit(hashSeed(seedKey + ':parent:' + b)) * footprints.length)
    const parent = footprints[parentIdx]
    const perimeter = getPerimeterCells(parent)

    const laneCandidates = perimeter
      .filter(([cx, cy]) => isAvailable(cx, cy, occupied) && !excluded.has(cellKey(cx, cy)))
      .filter(([cx, cy]) => {
        const adjCount = [[-1,0],[1,0],[0,-1],[0,1]].filter(([dx,dy]) =>
          excluded.has(cellKey(cx+dx, cy+dy))
        ).length
        return adjCount >= 1
      })
      .map(([lx, ly]) => {
        const tie = seededUnit(hashSeed(seedKey + ':lane:' + b + ':' + lx + ',' + ly))
        const dist = Math.abs(lx - anchorCx) + Math.abs(ly - anchorCy)
        return { laneCell: { cx: lx, cy: ly }, dist, tie }
      })
      .sort((a, b) => {
        if (a.dist !== b.dist) return a.dist - b.dist
        return a.tie - b.tie
      })

    let blockPlaced = false
    for (const { laneCell } of laneCandidates) {
      if (blockPlaced) break
      const lk = cellKey(laneCell.cx, laneCell.cy)
      excluded.add(lk)

      // All 4 directions. East/south: top-left 1 step from lane. West/north: top-left sized so block ends 1 step from lane.
      type Dir = { dx: number; dy: number; nx: (w: number, h: number) => number; ny: (w: number, h: number) => number }
      const dirs: Dir[] = [
        { dx: 1, dy: 0, nx: () => laneCell.cx + 1, ny: () => laneCell.cy },
        { dx: 0, dy: 1, nx: () => laneCell.cx, ny: () => laneCell.cy + 1 },
        { dx: -1, dy: 0, nx: (w) => laneCell.cx - w, ny: () => laneCell.cy },
        { dx: 0, dy: -1, nx: () => laneCell.cx, ny: (_, h) => laneCell.cy - h },
      ]
      const order = [...dirs].sort(() => seededUnit(hashSeed(seedKey + ':dir:' + b + laneCell.cx + ',' + laneCell.cy)) - 0.5)

      for (const d of order) {
        for (const [w, h] of sizesB) {
          const nx = d.nx(w, h)
          const ny = d.ny(w, h)
          if (!isAvailable(nx, ny, occupied) || excluded.has(cellKey(nx, ny))) continue

          const fp: BlockFootprint = { cx: nx, cy: ny, w, h }
          if (!footprintInBounds(fp)) continue
          if (footprintOverlapsExclusion(fp, excluded)) continue
          if (footprintTouchesBlocks(fp, blockCells)) continue
          const adjToLane = (() => {
            for (let i = 0; i < fp.w; i++) {
              for (let j = 0; j < fp.h; j++) {
                const manh = Math.abs((fp.cx + i) - laneCell.cx) + Math.abs((fp.cy + j) - laneCell.cy)
                if (manh === 1) return true
              }
            }
            return false
          })()
          if (!adjToLane) continue

          footprints.push(fp)
          laneCells.push(laneCell)
          connections.push({ fromBlock: parentIdx, toBlock: footprints.length - 1, laneCell })
          excluded = new Set([...excluded, ...getFootprintSet(fp), cellKey(laneCell.cx, laneCell.cy)])
          for (const k of getFootprintCells(fp)) blockCells.add(k)
          blockPlaced = true
          break
        }
        if (blockPlaced) break
      }
      excluded.delete(lk)
    }
    if (!blockPlaced) {
      console.warn('[factory] block placement failed for block', b, 'candidates=', laneCandidates.length)
    }
  }

  // Territory = blocks + lanes (compound-driven: expands to fit placement)
  const territorySet = new Set<string>()
  for (const fp of footprints) {
    for (const k of getFootprintCells(fp)) territorySet.add(k)
  }
  for (const l of laneCells) territorySet.add(cellKey(l.cx, l.cy))
  const territoryCells: [number, number][] = Array.from(territorySet).map((k) => {
    const [cx, cy] = k.split(',').map(Number)
    return [cx, cy] as [number, number]
  })

  return { footprints, laneCells, connections, territoryCells }
}
