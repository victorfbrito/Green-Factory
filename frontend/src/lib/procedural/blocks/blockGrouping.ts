/**
 * Split compound count into block groups. Block area limits capacity.
 * No 3–4 cap; groups of 4–6 when possible.
 */

/**
 * Split compound count into block sizes. Distributes evenly.
 * Deterministic from seedKey.
 */
export function splitCompoundsIntoBlocks(compoundCount: number, _seedKey: string): number[] {
  if (compoundCount <= 0) return []
  if (compoundCount <= 6) return [compoundCount]

  const numBlocks = Math.max(1, Math.ceil(compoundCount / 6))
  const baseSize = Math.floor(compoundCount / numBlocks)
  const remainder = compoundCount - baseSize * numBlocks
  return Array.from({ length: numBlocks }, (_, i) =>
    baseSize + (i < remainder ? 1 : 0)
  )
}
