/**
 * Block formation: group 1–4 Compounds into Blocks.
 * Block = cluster of compounds. Different blocks are separated by paths/service lanes.
 * Deterministic from seed_key.
 */

import { hashSeed, seededUnit } from '../seed'
import type { Compound } from '../compounds/compoundExtract'

export interface Block {
  compounds: Compound[]
}

const MAX_COMPOUNDS_PER_BLOCK = 4
const NEIGHBOR_DIST = 3

function compoundCenter(c: Compound): [number, number] {
  return [c.cx + c.w / 2, c.cy + c.h / 2]
}

function manhattan(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by)
}

/**
 * Group compounds into blocks. Each block contains 1–4 compounds.
 * Compounds in the same block are spatially close.
 * Deterministic: same compounds + seedKey => same blocks.
 */
export function formBlocks(compounds: Compound[], seedKey: string): Block[] {
  if (compounds.length === 0) return []
  if (compounds.length === 1) return [{ compounds }]

  const assigned = new Set<number>()
  const blocks: Block[] = []

  const sortKey = (i: number) => {
    const c = compounds[i]
    return `${c.cx},${c.cy}`
  }

  const unassigned = compounds
    .map((_, i) => i)
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)))

  for (const startIdx of unassigned) {
    if (assigned.has(startIdx)) continue

    const blockCompounds: Compound[] = [compounds[startIdx]]
    assigned.add(startIdx)
    const [sx, sy] = compoundCenter(compounds[startIdx])

    const candidates = unassigned
      .filter((i) => !assigned.has(i))
      .map((i) => {
        const [cx, cy] = compoundCenter(compounds[i])
        const dist = manhattan(sx, sy, cx, cy)
        const tie = seededUnit(hashSeed(seedKey + ':block:' + startIdx + ':' + i))
        return { i, dist, tie }
      })
      .sort((a, b) => {
        if (a.dist !== b.dist) return a.dist - b.dist
        return a.tie - b.tie
      })

    for (const { i } of candidates) {
      if (blockCompounds.length >= MAX_COMPOUNDS_PER_BLOCK) break
      const [cx, cy] = compoundCenter(compounds[i])
      const minDist = Math.min(...blockCompounds.map((c) => {
        const [mx, my] = compoundCenter(c)
        return manhattan(cx, cy, mx, my)
      }))
      if (minDist <= NEIGHBOR_DIST) {
        blockCompounds.push(compounds[i])
        assigned.add(i)
      }
    }

    blocks.push({ compounds: blockCompounds })
  }

  return blocks
}
