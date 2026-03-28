/**
 * Group compounds into blocks. Each block contains 1–4 compounds.
 * Deterministic from seedKey. Compounds are the source of truth; blocks are layout only.
 */

const MAX_COMPOUNDS_PER_BLOCK = 4

/**
 * Split compound count into block sizes. Each block gets 1–4 compounds.
 * Deterministic: same compoundCount + seedKey => same block sizes.
 */
export function groupCompoundsIntoBlocks(compoundCount: number, _seedKey: string): number[] {
  if (compoundCount <= 0) return []
  if (compoundCount <= MAX_COMPOUNDS_PER_BLOCK) return [compoundCount]

  const numBlocks = Math.max(1, Math.ceil(compoundCount / MAX_COMPOUNDS_PER_BLOCK))
  const baseSize = Math.floor(compoundCount / numBlocks)
  const remainder = compoundCount - baseSize * numBlocks

  return Array.from({ length: numBlocks }, (_, i) =>
    Math.max(1, Math.min(MAX_COMPOUNDS_PER_BLOCK, baseSize + (i < remainder ? 1 : 0)))
  )
}
