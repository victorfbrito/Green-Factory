/**
 * Deterministic compound identity selection.
 *
 * Uses the same seeded helpers as the rest of procedural (hashSeed + seededUnit) so
 * seed_key + district/block/slot indices always yield the same building identity.
 * sector_tier is not in the API payload; we derive an effective tier from language
 * ordering (compound_count, xp_share, sort_order) so higher-importance districts read as
 * more advanced campuses without backend changes.
 */

import type { FactoryLanguage } from '../../types'
import { hashSeed, seededUnit } from '../procedural/seed'
import type { Compound } from '../procedural/compounds/compoundExtract'
import type { CompoundCategory, CompoundDefinition, CompoundSemantic } from './compoundRegistry'
import { COMPOUND_REGISTRY, getCompoundDefinitionById } from './compoundRegistry'
import { getBlockThemesForTier, type BlockTheme } from './blockThemes'

/** Effective campus tier 1–5 for a district, derived from relative language importance. */
export function deriveSectorTier(lang: FactoryLanguage, allLanguages: FactoryLanguage[]): 1 | 2 | 3 | 4 | 5 {
  if (allLanguages.length === 0) return 3
  const sorted = [...allLanguages].sort((a, b) => {
    if (b.compound_count !== a.compound_count) return b.compound_count - a.compound_count
    if (Math.abs(b.xp_share - a.xp_share) > 1e-9) return b.xp_share - a.xp_share
    return a.sort_order - b.sort_order
  })
  const rank = sorted.findIndex((l) => l.course_id === lang.course_id && l.seed_key === lang.seed_key)
  const r = rank < 0 ? 0 : rank
  const n = sorted.length
  if (n === 1) return 5
  const t = 5 - Math.round((r / (n - 1)) * 4)
  return Math.max(1, Math.min(5, t)) as 1 | 2 | 3 | 4 | 5
}

/** Categories allowed at a tier (mirrors theme unlock order). */
export function getAllowedCategoriesForTier(tier: 1 | 2 | 3 | 4 | 5): CompoundCategory[] {
  const cats: CompoundCategory[] = ['intake']
  if (tier >= 2) cats.push('processing')
  if (tier >= 3) cats.push('storage')
  if (tier >= 4) cats.push('distribution')
  if (tier >= 5) {
    cats.push('research')
    cats.push('culture')
  }
  return cats
}

export function getAvailableCompoundsForDistrictTier(tier: 1 | 2 | 3 | 4 | 5): CompoundDefinition[] {
  return COMPOUND_REGISTRY.filter((d) => d.tierRequired <= tier)
}

export function getAvailableCompoundsForBlockTheme(
  theme: BlockTheme,
  districtTier: 1 | 2 | 3 | 4 | 5
): CompoundDefinition[] {
  const ids = new Set(theme.preferredCompoundIds)
  return COMPOUND_REGISTRY.filter((d) => ids.has(d.id) && d.tierRequired <= districtTier)
}

function tierThemeWeights(
  tier: 1 | 2 | 3 | 4 | 5
): Partial<Record<CompoundCategory, number>> {
  switch (tier) {
    case 1:
      return { intake: 0.8, processing: 0.12, culture: 0.08 }
    case 2:
      return { intake: 0.35, processing: 0.55, storage: 0.1 }
    case 3:
      return { intake: 0.2, processing: 0.35, storage: 0.45 }
    case 4:
      return { intake: 0.1, processing: 0.2, storage: 0.3, distribution: 0.4 }
    case 5:
    default:
      return {
        intake: 0.08,
        processing: 0.12,
        storage: 0.15,
        distribution: 0.15,
        research: 0.28,
        culture: 0.22,
      }
  }
}

function weightedPickTheme(
  seedKey: string,
  tier: 1 | 2 | 3 | 4 | 5,
  blockIndex: number,
  allowed: BlockTheme[]
): BlockTheme {
  const weights = tierThemeWeights(tier)
  const scored = allowed.map((t) => ({ t, w: weights[t.category] ?? 0.05 }))
  const total = scored.reduce((s, x) => s + x.w, 0)
  let r = seededUnit(hashSeed(seedKey + ':blockThemeW:' + blockIndex)) * total
  for (const { t, w } of scored) {
    r -= w
    if (r <= 0) return t
  }
  return scored[scored.length - 1].t
}

function pickBlockTheme(seedKey: string, tier: 1 | 2 | 3 | 4 | 5, blockIndex: number): BlockTheme {
  const allowed = getBlockThemesForTier(tier)
  if (allowed.length === 0) {
    return getBlockThemesForTier(1)[0]
  }
  if (allowed.length === 1) return allowed[0]
  return weightedPickTheme(seedKey, tier, blockIndex, allowed)
}

function filterLandmarkPreference(pool: CompoundDefinition[], isLandmark: boolean): CompoundDefinition[] {
  if (!isLandmark) return pool
  const marked = pool.filter((d) => d.landmark === true || d.size === 'landmark')
  return marked.length > 0 ? marked : pool
}

function poolForSlot(
  theme: BlockTheme,
  tier: 1 | 2 | 3 | 4 | 5,
  isLandmark: boolean,
  seedKey: string,
  blockIndex: number,
  slotIndex: number
): CompoundDefinition[] {
  if (tier === 1 && theme.category === 'intake') {
    const r = seededUnit(hashSeed(seedKey + ':t1support:' + blockIndex + ':' + slotIndex))
    if (r < 0.2) {
      const support = COMPOUND_REGISTRY.filter((d) => d.category === 'processing' && d.tierRequired <= 1)
      if (support.length > 0) return filterLandmarkPreference(support, isLandmark)
    }
  }

  let pool = getAvailableCompoundsForBlockTheme(theme, tier)
  pool = filterLandmarkPreference(pool, isLandmark)
  if (pool.length === 0) {
    pool = getAvailableCompoundsForBlockTheme(theme, tier)
  }
  if (pool.length === 0) {
    pool = getAvailableCompoundsForDistrictTier(tier).filter((d) => d.category === theme.category)
  }
  if (pool.length === 0) {
    pool = getAvailableCompoundsForDistrictTier(tier)
  }
  return pool
}

function pickDefinitionFromPool(
  seedKey: string,
  blockIndex: number,
  slotIndex: number,
  pool: CompoundDefinition[]
): CompoundDefinition {
  const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id))
  const h = hashSeed(seedKey + ':cmp:' + blockIndex + ':' + slotIndex)
  return sorted[h % sorted.length]
}

function toSemantic(d: CompoundDefinition): CompoundSemantic {
  return {
    compoundDefinitionId: d.id,
    category: d.category,
    size: d.size,
    animationType: d.animationType,
    displayName: d.name,
  }
}

/**
 * Assign registry-backed semantics to every compound in a block after spatial packing.
 * Mutates compound objects in place.
 */
export function assignSemanticsToBlockCompounds(
  compounds: Compound[],
  seedKey: string,
  districtTier: 1 | 2 | 3 | 4 | 5,
  blockIndex: number
): void {
  const theme = pickBlockTheme(seedKey, districtTier, blockIndex)
  compounds.forEach((compound, slotIndex) => {
    const pool = poolForSlot(theme, districtTier, compound.isLandmark === true, seedKey, blockIndex, slotIndex)
    const def = pickDefinitionFromPool(seedKey, blockIndex, slotIndex, pool)
    compound.semantic = toSemantic(def)
  })
}

/** Look up semantic from id (e.g. for debugging). */
export function compoundSemanticFromDefinitionId(id: string): CompoundSemantic | null {
  const d = getCompoundDefinitionById(id)
  return d ? toSemantic(d) : null
}
