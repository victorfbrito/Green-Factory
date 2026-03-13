/**
 * Split compound count into block groups (1–4 compounds per block).
 * Blocks are spatial organization only; grouping is deterministic.
 * Prefer balanced groups (2–3 per block when possible).
 */

/**
 * Split compound count into block sizes. Each block gets 1–4 compounds.
 * Prefer balanced groups (2–3 per block). Deterministic from seedKey.
 * Examples: 5→[3,2], 8→[3,3,2], 11→[3,3,3,2]
 */
export function splitCompoundsIntoBlocks(compoundCount: number, _seedKey: string): number[] {
  if (compoundCount <= 0) return []
  if (compoundCount <= 4) return [compoundCount]

  const n = Math.floor(compoundCount / 3)
  const remainder = compoundCount - 3 * n

  if (remainder === 0) {
    return Array(n).fill(3)
  }
  if (remainder === 1) {
    return [...Array(n - 1).fill(3), 4]
  }
  return [...Array(n).fill(3), 2]
}
