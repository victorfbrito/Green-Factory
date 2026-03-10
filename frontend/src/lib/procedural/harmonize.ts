/**
 * Building harmonization pass: post-process generated building cells into cleaner
 * orthogonal factory compounds while preserving district identity and approximate mass.
 *
 * Rules:
 * - Merge adjacent 1x1 into 2x1/1x2/2x2 where possible; complete 2x2 from L-shaped 3-cells.
 * - Prefer straight edges: remove some isolated singles (courtyards) and diagonal protrusions.
 * - Fill internal holes (3+ building neighbors) with seed-based probability to form mass or leave as courtyard.
 * - Cap adds/removes to preserve district mass approximately.
 *
 * Determinism: same seedKey + territory + input cells => same output. All tie-breaking uses seedKey.
 */

import { hashSeed, seededUnit } from './seed'

const CARDINAL = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const

function key(cx: number, cy: number): string {
  return `${cx},${cy}`
}

function parseKey(k: string): [number, number] {
  const [cx, cy] = k.split(',').map(Number)
  return [cx, cy]
}

/** Deterministic [0,1) for a given string. */
function rand(seedKey: string, suffix: string): number {
  let h = 5381
  const s = seedKey + suffix
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i)
  return seededUnit(h >>> 0)
}

/**
 * Get connected components of building cells (cardinal adjacency only).
 * Returns array of components, each component as array of cell keys. Sorted by size desc, then by min key for tie-break.
 */
function getConnectedComponents(
  buildingSet: Set<string>,
  seedKey: string
): string[][] {
  const visited = new Set<string>()
  const components: string[][] = []

  for (const k of buildingSet) {
    if (visited.has(k)) continue
    const stack = [k]
    const comp: string[] = []
    visited.add(k)
    while (stack.length > 0) {
      const cur = stack.pop()!
      comp.push(cur)
      const [cx, cy] = parseKey(cur)
      for (const [dx, dy] of CARDINAL) {
        const nk = key(cx + dx, cy + dy)
        if (buildingSet.has(nk) && !visited.has(nk)) {
          visited.add(nk)
          stack.push(nk)
        }
      }
    }
    if (comp.length > 0) components.push(comp)
  }

  components.sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length
    const minA = a.slice().sort()[0]
    const minB = b.slice().sort()[0]
    if (minA !== minB) return minA.localeCompare(minB)
    return hashSeed(seedKey + minA) - hashSeed(seedKey + minB)
  })
  return components
}

/**
 * Harmonize building cells into cleaner orthogonal compounds.
 * - Preserves district mass approximately (caps on adds/removes).
 * - Keeps intentional empty space (some isolated cells become courtyards).
 * - Completes 2x2 and extends 2x1 where territory allows; fills internal holes sparingly.
 * - Reduces diagonal protrusions (remove tail cells or complete L to 2x2).
 */
export function harmonizeBuildingCells(
  buildingCells: [number, number][],
  territory: [number, number][],
  seedKey: string
): [number, number][] {
  const territorySet = new Set(territory.map(([cx, cy]) => key(cx, cy)))
  const buildingSet = new Set(buildingCells.map(([cx, cy]) => key(cx, cy)))

  const addCell = (cx: number, cy: number): boolean => {
    const k = key(cx, cy)
    if (!territorySet.has(k) || buildingSet.has(k)) return false
    buildingSet.add(k)
    return true
  }

  const removeCell = (cx: number, cy: number): void => {
    buildingSet.delete(key(cx, cy))
  }

  const countBuildingNeighbors = (cx: number, cy: number): number => {
    let n = 0
    for (const [dx, dy] of CARDINAL) {
      if (buildingSet.has(key(cx + dx, cy + dy))) n++
    }
    return n
  }

  const maxRemove = Math.max(0, Math.floor(buildingCells.length * 0.12))
  const maxAdd = Math.max(0, Math.min(territory.length - buildingCells.length, Math.floor(territory.length * 0.10)))
  let removed = 0
  let added = 0

  // --- 1) Remove some isolated singles (courtyards). Deterministic by seed per cell. ---
  const components = getConnectedComponents(buildingSet, seedKey + ':iso')
  for (const comp of components) {
    if (comp.length !== 1 || removed >= maxRemove) continue
    const [cx, cy] = parseKey(comp[0])
    if (rand(seedKey, ':courtyard:' + comp[0]) < 0.4) {
      removeCell(cx, cy)
      removed++
    }
  }

  // --- 2) Complete 2x2 from L-shaped triplets (three cells of a 2x2 filled). Prefer straight blocks. ---
  const twoByTwoTops = new Set<string>()
  for (const k of Array.from(buildingSet)) {
    const [cx, cy] = parseKey(k)
    for (const [ox, oy] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) {
      const tx = cx + ox
      const ty = cy + oy
      const corners = [key(tx, ty), key(tx + 1, ty), key(tx, ty + 1), key(tx + 1, ty + 1)]
      const filled = corners.filter((c) => buildingSet.has(c))
      if (filled.length !== 3) continue
      const empty = corners.find((c) => !buildingSet.has(c))!
      if (twoByTwoTops.has(tx + ',' + ty) || added >= maxAdd) continue
      if (!territorySet.has(empty)) continue
      const [ex, ey] = parseKey(empty)
      if (rand(seedKey, ':complete2x2:' + empty) < 0.85) {
        if (addCell(ex, ey)) {
          added++
          twoByTwoTops.add(tx + ',' + ty)
        }
      }
    }
  }

  // --- 3) Extend 2x1 into 2x2 where two adjacent cells have two empty territory neighbors forming 2x2. ---
  for (const k of Array.from(buildingSet)) {
    if (added >= maxAdd) break
    const [cx, cy] = parseKey(k)
    for (const [dx, dy] of CARDINAL) {
      const nx = cx + dx
      const ny = cy + dy
      if (!buildingSet.has(key(nx, ny))) continue
      const [ax, ay] = dx !== 0 ? [cx, cy + 1] : [cx + 1, cy]
      const [bx, by] = dx !== 0 ? [nx, ny + 1] : [nx + 1, ny]
      if (!territorySet.has(key(ax, ay)) || !territorySet.has(key(bx, by))) continue
      if (buildingSet.has(key(ax, ay)) || buildingSet.has(key(bx, by))) continue
      const topLeftX = Math.min(cx, nx, ax, bx)
      const topLeftY = Math.min(cy, ny, ay, by)
      if (twoByTwoTops.has(topLeftX + ',' + topLeftY)) continue
      if (rand(seedKey, ':ext2x2:' + ax + ',' + ay) < 0.6) {
        if (addCell(ax, ay)) {
          added++
          if (addCell(bx, by)) added++
          twoByTwoTops.add(topLeftX + ',' + topLeftY)
        }
        break
      }
    }
  }

  // --- 4) Fill internal holes: territory cell with 3+ building neighbors. Sparingly. ---
  const holeCandidates: string[] = []
  for (const k of territorySet) {
    if (buildingSet.has(k)) continue
    const [cx, cy] = parseKey(k)
    if (countBuildingNeighbors(cx, cy) >= 3) holeCandidates.push(k)
  }
  holeCandidates.sort()
  for (const k of holeCandidates) {
    if (added >= maxAdd) break
    const [cx, cy] = parseKey(k)
    if (rand(seedKey, ':hole:' + k) < 0.5) {
      addCell(cx, cy)
      added++
    }
  }

  // --- 5) Reduce diagonal protrusions: remove tail cells (exactly one neighbor that has other neighbors). ---
  const tails: string[] = []
  for (const k of buildingSet) {
    const [cx, cy] = parseKey(k)
    const neighbors = CARDINAL.map(([dx, dy]) => key(cx + dx, cy + dy)).filter((nk) => buildingSet.has(nk))
    if (neighbors.length !== 1) continue
    const [nx, ny] = parseKey(neighbors[0])
    const neighborCount = countBuildingNeighbors(nx, ny)
    if (neighborCount >= 2) tails.push(k)
  }
  tails.sort()
  for (const k of tails) {
    if (removed >= maxRemove) break
    if (rand(seedKey, ':tail:' + k) < 0.35) {
      const [cx, cy] = parseKey(k)
      removeCell(cx, cy)
      removed++
    }
  }

  return Array.from(buildingSet, (k) => parseKey(k))
}
