/**
 * Stage E: Path layer.
 * Path – Sequence of walkable cells (hub ↔ district entrance).
 * Post-process only. Pathfinding reads the map; paths never modify compounds or block counts.
 */

import { hashSeed, seededUnit } from '../seed'
import { cellKey, MAP_SIZE, worldToCell } from '../grid'
import { buildNavGrid, type NavGrid } from './navGrid'
import { selectDistrictEntrance } from './entrances'
import type { Compound } from '../compounds/compoundExtract'
import type { DistrictPlacement } from '../scene/types'

export interface PathCell {
  cx: number
  cy: number
}

const DIRS: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]]
const EMPTY_COST = 1
const ROAD_COST = 0.4

function findNearestWalkable(grid: NavGrid, startCx: number, startCy: number, maxRadius = 20): PathCell | null {
  const startK = cellKey(startCx, startCy)
  if (!grid.blocked.has(startK)) return { cx: startCx, cy: startCy }
  const visited = new Set<string>([cellKey(startCx, startCy)])
  const queue: [number, number, number][] = [[startCx, startCy, 0]]
  while (queue.length > 0) {
    const [cx, cy, dist] = queue.shift()!
    if (dist > maxRadius) break
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx
      const ny = cy + dy
      const k = cellKey(nx, ny)
      if (visited.has(k)) continue
      visited.add(k)
      if (grid.blocked.has(k)) {
        queue.push([nx, ny, dist + 1])
      } else {
        return { cx: nx, cy: ny }
      }
    }
  }
  return null
}

function manhattan(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by)
}

function heuristic(ax: number, ay: number, bx: number, by: number): number {
  return manhattan(ax, ay, bx, by) * ROAD_COST
}

function reconstructPath(cameFrom: Map<string, string>, endKey: string): PathCell[] {
  const out: PathCell[] = []
  let current = endKey
  while (cameFrom.has(current)) {
    const [cx, cy] = current.split(',').map(Number)
    out.push({ cx, cy })
    const prev = cameFrom.get(current)
    if (!prev) break
    current = prev
  }
  const [sx, sy] = current.split(',').map(Number)
  out.push({ cx: sx, cy: sy })
  out.reverse()
  return out
}

function findPathAStar(
  grid: NavGrid,
  roadCells: Set<string>,
  start: PathCell,
  goal: PathCell,
  seedKeyForTies: string
): PathCell[] | null {
  const startK = cellKey(start.cx, start.cy)
  const goalK = cellKey(goal.cx, goal.cy)
  if (startK === goalK) return [start]

  const open: string[] = [startK]
  const cameFrom = new Map<string, string>()
  const gScore = new Map<string, number>([[startK, 0]])
  const fScore = new Map<string, number>([[startK, heuristic(start.cx, start.cy, goal.cx, goal.cy)]])

  while (open.length > 0) {
    let bestIdx = 0
    let bestK = open[0]
    let bestF = fScore.get(bestK) ?? Infinity
    for (let i = 1; i < open.length; i++) {
      const k = open[i]
      const f = fScore.get(k) ?? Infinity
      if (f < bestF || (f === bestF && k < bestK)) {
        bestF = f
        bestK = k
        bestIdx = i
      }
    }
    const current = bestK
    if (current === goalK) return reconstructPath(cameFrom, current)
    open.splice(bestIdx, 1)
    const [cx, cy] = current.split(',').map(Number)
    const currentG = gScore.get(current) ?? Infinity
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx
      const ny = cy + dy
      if (grid.blocked.has(cellKey(nx, ny))) continue
      if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue
      const nk = cellKey(nx, ny)
      const stepCost = roadCells.has(nk) ? ROAD_COST : EMPTY_COST
      const tentativeG = currentG + stepCost
      if (tentativeG >= (gScore.get(nk) ?? Infinity)) continue
      cameFrom.set(nk, current)
      gScore.set(nk, tentativeG)
      const h = heuristic(nx, ny, goal.cx, goal.cy)
      const tie = seededUnit(hashSeed(seedKeyForTies + ':' + nk))
      fScore.set(nk, tentativeG + h + tie * 1e-4)
      if (!open.includes(nk)) open.push(nk)
    }
  }
  return null
}

export interface PathLayerResult {
  paths: PathCell[][]
  entrances: { cx: number; cy: number }[]
}

/**
 * Build paths from hub to each district entrance.
 * Paths never modify compounds or block counts.
 */
export function buildPaths(
  districts: DistrictPlacement[],
  compoundLists: Compound[][],
  blockedCells: Set<string>
): PathLayerResult {
  const grid = buildNavGrid(blockedCells)
  const hubWorld = MAP_SIZE / 2
  const [hubCx, hubCy] = worldToCell(hubWorld, hubWorld)
  const hubCell = findNearestWalkable(grid, hubCx, hubCy)
  if (!hubCell) return { paths: [], entrances: [] }

  const paths: PathCell[][] = []
  const entrances: { cx: number; cy: number }[] = []
  const roadCells = new Set<string>()
  const seedKeyForTies = districts[0]?.language.seed_key ?? 'paths'

  for (let i = 0; i < districts.length; i++) {
    const d = districts[i]
    const [acx, acy] = worldToCell(d.x, d.y)
    const compounds = compoundLists[i] ?? []
    const entry =
      selectDistrictEntrance(grid, i, compounds, acx, acy, hubCell, d.language.seed_key) ??
      findNearestWalkable(grid, acx, acy)
    if (!entry) continue
    const path = findPathAStar(grid, roadCells, hubCell, entry, seedKeyForTies + ':' + d.language.seed_key)
    if (path && path.length > 1) {
      paths.push(path)
      entrances.push(entry)
      for (const { cx, cy } of path) {
        roadCells.add(cellKey(cx, cy))
      }
    }
  }

  return { paths, entrances }
}
