/**
 * Compound count from language data.
 * Compounds represent district building mass from progress.
 * NOT derived from territory, blocks, or footprint area.
 */

import { seeded } from '../seed'

/** Min compounds per district by sector_tier (0–5). Max driven by block area, not capped here. */
const MIN_COMPOUNDS_BY_TIER = [2, 3, 4, 6, 8, 12]
const MAX_COMPOUNDS_BY_TIER = [12, 18, 28, 42, 56, 72]

/**
 * Compute compound count directly from language data.
 * No artificial 3–4 cap; block area limits actual placement.
 * Deterministic: same inputs => same count.
 */
export function getCompoundCountFromLanguage(
  _xp: number,
  sectorTier: number,
  xpShare: number,
  seedKey: string
): number {
  const t = Math.max(0, Math.min(5, sectorTier))
  const minC = MIN_COMPOUNDS_BY_TIER[t]
  const maxC = MAX_COMPOUNDS_BY_TIER[t]
  const span = maxC - minC + 1
  let offset = Math.floor(seeded(seedKey, 'cc') * span)
  if (span > 1 && xpShare > 0.6) offset = Math.min(offset + 1, span - 1)
  return Math.max(minC, Math.min(maxC, minC + offset))
}
