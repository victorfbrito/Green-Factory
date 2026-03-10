import type { DistrictPlacement, WorldBlock } from './index'
import { CELL_SIZE, GRID_SIZE, MAP_SIZE, worldToCell, hashSeed, seededUnit } from './index'

export interface PathCell {
  cx: number
  cy: number
}

export interface CampusPaths {
  paths: PathCell[][]
}

/** Only building (and other obstacle) cells. Roads are NOT blocked and remain traversable. */
interface NavGrid {
  width: number
  height: number
  blocked: Set<string>
}

/** Cost for stepping onto an empty cell. */
const EMPTY_COST = 1
/** Cost for stepping onto an existing road cell; lower so paths prefer reusing roads. */
const ROAD_COST = 0.4

const DIRS: [number, number][] = [
  [0, -1], // N
  [1, 0],  // E
  [0, 1],  // S
  [-1, 0], // W
]

const cellKey = (cx: number, cy: number) => `${cx},${cy}`

function buildNavGrid(blockLists: WorldBlock[][]): NavGrid {
  const blocked = new Set<string>()
  for (const blocks of blockLists) {
    for (const b of blocks) {
      const x0 = b.x
      const y0 = b.y
      const x1 = b.x + b.w
      const y1 = b.y + b.h
      const cxStart = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(x0 / CELL_SIZE)))
      const cxEnd = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((x1 - 0.001) / CELL_SIZE)))
      const cyStart = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(y0 / CELL_SIZE)))
      const cyEnd = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((y1 - 0.001) / CELL_SIZE)))
      for (let cx = cxStart; cx <= cxEnd; cx++) {
        for (let cy = cyStart; cy <= cyEnd; cy++) {
          blocked.add(cellKey(cx, cy))
        }
      }
    }
  }
  return { width: GRID_SIZE, height: GRID_SIZE, blocked }
}

function isWalkable(grid: NavGrid, cx: number, cy: number): boolean {
  if (cx < 0 || cx >= grid.width || cy < 0 || cy >= grid.height) return false
  return !grid.blocked.has(cellKey(cx, cy))
}

function findNearestWalkable(grid: NavGrid, startCx: number, startCy: number, maxRadius = 20): PathCell | null {
  if (isWalkable(grid, startCx, startCy)) return { cx: startCx, cy: startCy }
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
      if (!isWalkable(grid, nx, ny)) {
        queue.push([nx, ny, dist + 1])
      } else {
        return { cx: nx, cy: ny }
      }
    }
  }
  return null
}

/** Set of cell keys covered by the given blocks (same mapping as buildNavGrid). */
function getDistrictBuildingCells(blocks: WorldBlock[]): Set<string> {
  const out = new Set<string>()
  for (const b of blocks) {
    const x0 = b.x
    const y0 = b.y
    const x1 = b.x + b.w
    const y1 = b.y + b.h
    const cxStart = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(x0 / CELL_SIZE)))
    const cxEnd = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((x1 - 0.001) / CELL_SIZE)))
    const cyStart = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(y0 / CELL_SIZE)))
    const cyEnd = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((y1 - 0.001) / CELL_SIZE)))
    for (let cx = cxStart; cx <= cxEnd; cx++) {
      for (let cy = cyStart; cy <= cyEnd; cy++) {
        out.add(cellKey(cx, cy))
      }
    }
  }
  return out
}

/** Walkable cells that are adjacent to at least one cell of this district's buildings (perimeter / front-door candidates). */
function getCandidateEntranceCells(
  grid: NavGrid,
  districtBuildingCells: Set<string>
): PathCell[] {
  const candidates: PathCell[] = []
  const seen = new Set<string>()
  for (const key of districtBuildingCells) {
    const [cx, cy] = key.split(',').map(Number)
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx
      const ny = cy + dy
      if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue
      if (districtBuildingCells.has(cellKey(nx, ny))) continue
      if (!isWalkable(grid, nx, ny)) continue
      const nk = cellKey(nx, ny)
      if (seen.has(nk)) continue
      seen.add(nk)
      candidates.push({ cx: nx, cy: ny })
    }
  }
  return candidates
}

/** Count walkable cardinal neighbors. */
function countWalkableNeighbors(grid: NavGrid, cx: number, cy: number): number {
  let n = 0
  for (const [dx, dy] of DIRS) {
    if (isWalkable(grid, cx + dx, cy + dy)) n++
  }
  return n
}

/**
 * Choose the best entrance cell for a district: perimeter candidate with highest score.
 * Score: closer to hub (better), aligned with direction anchor→hub (better), more open (better), deterministic tie-break.
 */
function selectDistrictEntrance(
  grid: NavGrid,
  districtIndex: number,
  blocks: WorldBlock[],
  anchorCx: number,
  anchorCy: number,
  hubCell: PathCell,
  seedKey: string
): PathCell | null {
  const districtBuildingCells = getDistrictBuildingCells(blocks)
  const candidates = getCandidateEntranceCells(grid, districtBuildingCells)
  if (candidates.length === 0) return null

  const hx = hubCell.cx
  const hy = hubCell.cy
  const dx = hx - anchorCx
  const dy = hy - anchorCy
  const hubDirLen = Math.sqrt(dx * dx + dy * dy) || 1

  let best: PathCell | null = null
  let bestScore = -Infinity

  for (const c of candidates) {
    const toHub = manhattan(c.cx, c.cy, hx, hy)
    const ax = c.cx - anchorCx
    const ay = c.cy - anchorCy
    const align = hubDirLen > 0 ? (ax * dx + ay * dy) / (hubDirLen * (Math.sqrt(ax * ax + ay * ay) || 1)) : 0
    const openness = countWalkableNeighbors(grid, c.cx, c.cy) / 4
    const tie = seededUnit(hashSeed(seedKey + ':entrance:' + districtIndex + ':' + cellKey(c.cx, c.cy)))

    const score = -0.05 * toHub + 0.4 * align + 0.2 * openness + tie * 1e-3
    if (score > bestScore) {
      bestScore = score
      best = c
    }
  }

  return best
}

function manhattan(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by)
}

/** Admissible heuristic: Manhattan distance × minimum step cost (ROAD_COST). */
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
    for (let dirIdx = 0; dirIdx < DIRS.length; dirIdx++) {
      const [dx, dy] = DIRS[dirIdx]
      const nx = cx + dx
      const ny = cy + dy
      if (!isWalkable(grid, nx, ny)) continue
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

export function buildCampusPaths(districts: DistrictPlacement[], blockLists: WorldBlock[][]): CampusPaths {
  const grid = buildNavGrid(blockLists)
  const hubWorld = MAP_SIZE / 2
  const [hubCx, hubCy] = worldToCell(hubWorld, hubWorld)
  const hubCell = findNearestWalkable(grid, hubCx, hubCy)
  if (!hubCell) return { paths: [] }

  const paths: PathCell[][] = []
  const seedKeyForTies = districts[0]?.language.seed_key ?? 'paths'
  /** Cells that already have a road; traversable and preferred (lower cost). Never added to grid.blocked. */
  const roadCells = new Set<string>()

  for (let i = 0; i < districts.length; i++) {
    const d = districts[i]
    const [acx, acy] = worldToCell(d.x, d.y)
    const blocks = blockLists[i] ?? []
    const entry =
      selectDistrictEntrance(grid, i, blocks, acx, acy, hubCell, d.language.seed_key) ??
      findNearestWalkable(grid, acx, acy)
    if (!entry) continue
    // Debug: uncomment to log chosen entrance per district
    // if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    //   console.log('[paths] district', i, d.language.language_name, 'entrance', entry.cx, entry.cy)
    // }
    const path = findPathAStar(grid, roadCells, hubCell, entry, seedKeyForTies + ':' + d.language.seed_key)
    if (path && path.length > 1) {
      paths.push(path)
      for (const { cx, cy } of path) {
        roadCells.add(cellKey(cx, cy))
      }
    }
  }

  return { paths }
}

