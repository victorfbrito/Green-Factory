/**
 * Harmonize building cells into cleaner orthogonal compounds.
 * Preserves district mass approximately. Rectangular only.
 */

import { hashSeed, seededUnit } from '../seed'
import { cellKey } from '../grid'

const CARDINAL = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const

function parseKey(k: string): [number, number] {
  const [cx, cy] = k.split(',').map(Number)
  return [cx, cy]
}

function rand(seedKey: string, suffix: string): number {
  return seededUnit(hashSeed(seedKey + suffix) >>> 0)
}

function getConnectedComponents(buildingSet: Set<string>, seedKey: string): string[][] {
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
        const nk = cellKey(cx + dx, cy + dy)
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

function countBuildingNeighbors(cx: number, cy: number, buildingSet: Set<string>): number {
  let n = 0
  for (const [dx, dy] of CARDINAL) {
    if (buildingSet.has(cellKey(cx + dx, cy + dy))) n++
  }
  return n
}

/**
 * Harmonize building cells into cleaner orthogonal compounds.
 * Deterministic: same seedKey + territory + input => same output.
 */
export function harmonizeCompoundCells(
  buildingCells: [number, number][],
  territory: [number, number][],
  seedKey: string
): [number, number][] {
  const territorySet = new Set(territory.map(([cx, cy]) => cellKey(cx, cy)))
  const buildingSet = new Set(buildingCells.map(([cx, cy]) => cellKey(cx, cy)))

  const addCell = (cx: number, cy: number): boolean => {
    const k = cellKey(cx, cy)
    if (!territorySet.has(k) || buildingSet.has(k)) return false
    buildingSet.add(k)
    return true
  }

  const removeCell = (cx: number, cy: number): void => {
    buildingSet.delete(cellKey(cx, cy))
  }

  const maxRemove = Math.max(0, Math.floor(buildingCells.length * 0.12))
  const maxAdd = Math.max(0, Math.min(territory.length - buildingCells.length, Math.floor(territory.length * 0.10)))
  let removed = 0
  let added = 0

  const components = getConnectedComponents(buildingSet, seedKey + ':iso')
  for (const comp of components) {
    if (comp.length !== 1 || removed >= maxRemove) continue
    const [cx, cy] = parseKey(comp[0])
    if (rand(seedKey, ':courtyard:' + comp[0]) < 0.4) {
      removeCell(cx, cy)
      removed++
    }
  }

  const twoByTwoTops = new Set<string>()
  for (const k of Array.from(buildingSet)) {
    const [cx, cy] = parseKey(k)
    for (const [ox, oy] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) {
      const tx = cx + ox
      const ty = cy + oy
      const corners = [cellKey(tx, ty), cellKey(tx + 1, ty), cellKey(tx, ty + 1), cellKey(tx + 1, ty + 1)]
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

  for (const k of Array.from(buildingSet)) {
    if (added >= maxAdd) break
    const [cx, cy] = parseKey(k)
    for (const [dx, dy] of CARDINAL) {
      const nx = cx + dx
      const ny = cy + dy
      if (!buildingSet.has(cellKey(nx, ny))) continue
      const [ax, ay] = dx !== 0 ? [cx, cy + 1] : [cx + 1, cy]
      const [bx, by] = dx !== 0 ? [nx, ny + 1] : [nx + 1, ny]
      if (!territorySet.has(cellKey(ax, ay)) || !territorySet.has(cellKey(bx, by))) continue
      if (buildingSet.has(cellKey(ax, ay)) || buildingSet.has(cellKey(bx, by))) continue
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

  const holeCandidates: string[] = []
  for (const k of territorySet) {
    if (buildingSet.has(k)) continue
    const [cx, cy] = parseKey(k)
    if (countBuildingNeighbors(cx, cy, buildingSet) >= 3) holeCandidates.push(k)
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

  const tails: string[] = []
  for (const k of buildingSet) {
    const [cx, cy] = parseKey(k)
    const neighbors = CARDINAL.map(([dx, dy]) => cellKey(cx + dx, cy + dy)).filter((nk) => buildingSet.has(nk))
    if (neighbors.length !== 1) continue
    const [nx, ny] = parseKey(neighbors[0])
    if (countBuildingNeighbors(nx, ny, buildingSet) >= 2) tails.push(k)
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
