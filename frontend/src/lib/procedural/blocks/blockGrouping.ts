/**
 * Group compounds into blocks. Each block contains 1–4 compounds.
 * Deterministic from seedKey. Compounds are the source of truth; blocks are layout only.
 */

const MAX_COMPOUNDS_PER_BLOCK = 4

/**
 * Split compound count into block sizes. Each block gets 1–4 compounds.
 * Deterministic and stable: existing blocks stay filled before a new block is added.
 */
export function groupCompoundsIntoBlocks(compoundCount: number, _seedKey: string): number[] {
  if (compoundCount <= 0) return []
  if (compoundCount <= MAX_COMPOUNDS_PER_BLOCK) return [compoundCount]

  const fullBlocks = Math.floor(compoundCount / MAX_COMPOUNDS_PER_BLOCK)
  const remainder = compoundCount % MAX_COMPOUNDS_PER_BLOCK
  const blocks = Array.from({ length: fullBlocks }, () => MAX_COMPOUNDS_PER_BLOCK)
  if (remainder > 0) blocks.push(remainder)
  return blocks
}

/**
 * Reserve one future slot so the next compound location is visible
 * before the building itself is added.
 */
export function getPlannedBlockCapacities(compoundCount: number): number[] {
  const blockCount = Math.max(1, Math.ceil((compoundCount + 1) / MAX_COMPOUNDS_PER_BLOCK))
  return Array.from({ length: blockCount }, () => MAX_COMPOUNDS_PER_BLOCK)
}
