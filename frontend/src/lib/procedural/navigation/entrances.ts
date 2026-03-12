/**
 * District entrance selection.
 * District entrance – Walkable cell adjacent to district buildings, chosen as path endpoint.
 */

import { hashSeed, seededUnit } from '../seed'
import { cellKey } from '../grid'
import type { NavGrid } from './navGrid'
import type { Block } from '../buildings/blocks'

const DIRS: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]]

function getBlockOccupancy(blocks: Block[]): Set<string> {
  const out = new Set<string>()
  for (const b of blocks) {
    const cxStart = Math.floor(b.x / 14)
    const cxEnd = Math.floor((b.x + b.w - 0.001) / 14)
    const cyStart = Math.floor(b.y / 14)
    const cyEnd = Math.floor((b.y + b.h - 0.001) / 14)
    for (let cx = cxStart; cx <= cxEnd; cx++) {
      for (let cy = cyStart; cy <= cyEnd; cy++) {
        out.add(cellKey(cx, cy))
      }
    }
  }
  return out
}

function getCandidateEntranceCells(grid: NavGrid, buildingCells: Set<string>): { cx: number; cy: number }[] {
  const candidates: { cx: number; cy: number }[] = []
  const seen = new Set<string>()
  for (const key of buildingCells) {
    const [cx, cy] = key.split(',').map(Number)
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx
      const ny = cy + dy
      if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue
      if (buildingCells.has(cellKey(nx, ny))) continue
      const nk = cellKey(nx, ny)
      if (grid.blocked.has(nk)) continue
      if (seen.has(nk)) continue
      seen.add(nk)
      candidates.push({ cx: nx, cy: ny })
    }
  }
  return candidates
}

function countWalkableNeighbors(grid: NavGrid, cx: number, cy: number): number {
  let n = 0
  for (const [dx, dy] of DIRS) {
    const nx = cx + dx
    const ny = cy + dy
    if (nx >= 0 && nx < grid.width && ny >= 0 && ny < grid.height && !grid.blocked.has(cellKey(nx, ny))) n++
  }
  return n
}

function manhattan(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by)
}

/**
 * Choose the best district entrance: perimeter candidate with highest score.
 */
export function selectDistrictEntrance(
  grid: NavGrid,
  districtIndex: number,
  blocks: Block[],
  anchorCx: number,
  anchorCy: number,
  hubCell: { cx: number; cy: number },
  seedKey: string
): { cx: number; cy: number } | null {
  const buildingCells = getBlockOccupancy(blocks)
  const candidates = getCandidateEntranceCells(grid, buildingCells)
  if (candidates.length === 0) return null

  const hx = hubCell.cx
  const hy = hubCell.cy
  const dx = hx - anchorCx
  const dy = hy - anchorCy
  const hubDirLen = Math.sqrt(dx * dx + dy * dy) || 1

  let best: { cx: number; cy: number } | null = null
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
