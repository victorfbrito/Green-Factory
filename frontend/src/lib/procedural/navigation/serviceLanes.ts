/**
 * Service lane layer.
 * Service lanes connect blocks within a district (1-cell lanes between blocks)
 * and connect the district entrance to the block network.
 * All service lanes within the same district are connected to each other.
 * Uses only existing empty cells. Never modifies compounds.
 */

import { cellKey } from '../grid'
import { isWalkable, type NavGrid } from './navGrid'
import type { PathCell } from './paths'

const DIRS: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]]
const MAX_ENTRANCE_LANE_STEPS = 12

function isWalkableExcluding(
  grid: NavGrid,
  cx: number,
  cy: number,
  exclude: Set<string>
): boolean {
  if (!isWalkable(grid, cx, cy)) return false
  return !exclude.has(cellKey(cx, cy))
}

function findPathBFS(
  grid: NavGrid,
  start: { cx: number; cy: number },
  goal: { cx: number; cy: number },
  exclude: Set<string> = new Set()
): PathCell[] | null {
  const startK = cellKey(start.cx, start.cy)
  const goalK = cellKey(goal.cx, goal.cy)
  if (startK === goalK) return [start]

  const visited = new Set<string>([startK])
  const queue: { cx: number; cy: number; path: PathCell[] }[] = [{ ...start, path: [start] }]

  while (queue.length > 0) {
    const { cx, cy, path } = queue.shift()!
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx
      const ny = cy + dy
      const nk = cellKey(nx, ny)
      if (!isWalkableExcluding(grid, nx, ny, exclude) || visited.has(nk)) continue
      visited.add(nk)
      const newPath = [...path, { cx: nx, cy: ny }]
      if (nk === goalK) return newPath
      queue.push({ cx: nx, cy: ny, path: newPath })
    }
  }
  return null
}

/** Find shortest path from start to any cell in goals. Uses only walkable cells excluding the exclude set. */
function findPathToAnyBFS(
  grid: NavGrid,
  start: { cx: number; cy: number },
  goals: Set<string>,
  exclude: Set<string>
): PathCell[] | null {
  const startK = cellKey(start.cx, start.cy)
  if (goals.has(startK)) return [start]

  const visited = new Set<string>([startK])
  const queue: { cx: number; cy: number; path: PathCell[] }[] = [{ ...start, path: [start] }]

  while (queue.length > 0) {
    const { cx, cy, path } = queue.shift()!
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx
      const ny = cy + dy
      const nk = cellKey(nx, ny)
      if (!isWalkableExcluding(grid, nx, ny, exclude) || visited.has(nk)) continue
      visited.add(nk)
      const newPath = [...path, { cx: nx, cy: ny }]
      if (goals.has(nk)) return newPath
      queue.push({ cx: nx, cy: ny, path: newPath })
    }
  }
  return null
}

function getConnectedComponents(cells: { cx: number; cy: number }[]): Set<string>[] {
  const cellSet = new Set(cells.map((c) => cellKey(c.cx, c.cy)))
  const components: Set<string>[] = []
  const visited = new Set<string>()

  for (const c of cells) {
    const k = cellKey(c.cx, c.cy)
    if (visited.has(k)) continue
    const comp = new Set<string>()
    const queue: [number, number][] = [[c.cx, c.cy]]
    while (queue.length > 0) {
      const [cx, cy] = queue.shift()!
      const key = cellKey(cx, cy)
      if (visited.has(key)) continue
      visited.add(key)
      comp.add(key)
      for (const [dx, dy] of DIRS) {
        const nk = cellKey(cx + dx, cy + dy)
        if (cellSet.has(nk) && !visited.has(nk)) queue.push([cx + dx, cy + dy])
      }
    }
    components.push(comp)
  }
  return components
}

/**
 * Build service lane cells: block lanes + entrance connection + connectors so all lanes in a district are connected.
 */
export function buildServiceLanes(
  grid: NavGrid,
  paths: PathCell[][],
  districtEntrances: { cx: number; cy: number }[],
  districtIndices: number[],
  districtAnchors: { cx: number; cy: number }[],
  blockLaneCellsByDistrict: { cx: number; cy: number }[][]
): PathCell[] {
  const roadCells = new Set<string>()
  const pathCellsOnly = new Set<string>()
  for (const path of paths) {
    for (const cell of path) {
      const k = cellKey(cell.cx, cell.cy)
      roadCells.add(k)
      pathCellsOnly.add(k)
    }
  }

  const serviceLaneCells: PathCell[] = []
  const districtLaneCells: { cx: number; cy: number }[][] = []

  for (let i = 0; i < districtEntrances.length; i++) {
    const districtIdx = districtIndices[i] ?? i
    const blockLanes = blockLaneCellsByDistrict[districtIdx] ?? []
    const districtCells: { cx: number; cy: number }[] = []

    for (const cell of blockLanes) {
      const k = cellKey(cell.cx, cell.cy)
      if (isWalkable(grid, cell.cx, cell.cy) && !roadCells.has(k)) {
        districtCells.push(cell)
        serviceLaneCells.push({ cx: cell.cx, cy: cell.cy })
        roadCells.add(k)
      }
    }

    const entry = districtEntrances[i]
    const blockLaneKeys = new Set(blockLanes.map((lc) => cellKey(lc.cx, lc.cy)))
    const excludeForEntrance = new Set(pathCellsOnly)

    // Connect entrance to nearest block lane via BFS so we form one connected network
    const entrancePath = findPathToAnyBFS(
      grid,
      entry,
      blockLaneKeys,
      excludeForEntrance
    )
    if (entrancePath && entrancePath.length > 1) {
      for (let p = 1; p < Math.min(entrancePath.length, MAX_ENTRANCE_LANE_STEPS + 1); p++) {
        const { cx, cy } = entrancePath[p]
        const k = cellKey(cx, cy)
        if (blockLaneKeys.has(k)) break
        if (!roadCells.has(k)) {
          districtCells.push({ cx, cy })
          serviceLaneCells.push({ cx, cy })
          roadCells.add(k)
        }
      }
    }

    districtLaneCells.push(districtCells)
  }

  // Connect all disconnected components into one network. Use BFS that avoids path cells
  // so added connector cells form real adjacency links (no gaps through shared path cells).
  const MAX_CONNECTOR_ITERATIONS = 50
  for (let i = 0; i < districtLaneCells.length; i++) {
    const cells = districtLaneCells[i]
    if (cells.length <= 1) continue

    let components = getConnectedComponents(cells)
    let iterations = 0
    while (components.length > 1 && iterations < MAX_CONNECTOR_ITERATIONS) {
      iterations++
      const [compA, compB] = components
      const cellA = [...compA][0]
      const cellB = [...compB][0]
      const [ax, ay] = cellA.split(',').map(Number)
      const [bx, by] = cellB.split(',').map(Number)
      const path = findPathBFS(grid, { cx: ax, cy: ay }, { cx: bx, cy: by }, pathCellsOnly)
      if (!path) break

      for (let p = 1; p < path.length - 1; p++) {
        const { cx, cy } = path[p]
        const k = cellKey(cx, cy)
        serviceLaneCells.push({ cx, cy })
        roadCells.add(k)
        cells.push({ cx, cy })
      }
      components = getConnectedComponents(cells)
    }
  }

  return serviceLaneCells
}
