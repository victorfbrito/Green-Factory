import type { FactoryResponse, FactoryLanguage } from '../../types'
import { seededAngle, seededRadius, seededVariant } from './seed'

/** Environment level → theme id for styling. */
export type WorldThemeId =
  | 'industrial'
  | 'improving'
  | 'sustainable'
  | 'advanced_green'
  | 'regenerative'

export interface DistrictPlacement {
  /** Original language entry. */
  language: FactoryLanguage
  /** Center x (percent or px in a fixed-size map). */
  x: number
  /** Center y. */
  y: number
  /** Display radius/size. */
  radius: number
  /** Visual variant index for this district. */
  variant: number
}

export interface UpgradePlacement {
  id: string
  x: number
  y: number
  variant: number
}

export interface FactorySceneModel {
  worldTheme: WorldThemeId
  /** Map width/height for coordinate system. */
  mapSize: number
  /** Districts with deterministic positions and sizes. */
  districts: DistrictPlacement[]
  /** Global upgrades placed across campus. */
  upgrades: UpgradePlacement[]
  /** Index of the anchor (top-priority) district. */
  anchorIndex: number
}

const MAP_SIZE = 840
const CENTER_X = MAP_SIZE / 2
const CENTER_Y = MAP_SIZE / 2

function getThemeFromLabel(label: string): WorldThemeId {
  switch (label) {
    case 'industrial':
      return 'industrial'
    case 'improving':
      return 'improving'
    case 'sustainable':
      return 'sustainable'
    case 'advanced_green':
      return 'advanced_green'
    case 'regenerative':
      return 'regenerative'
    default:
      return 'industrial'
  }
}

/**
 * Order languages by "size" for layout: largest at center (sector_tier then xp_share).
 * Deterministic: same factory => same order. Ties broken by original index.
 */
function orderLanguagesBySize(languages: FactoryLanguage[]): FactoryLanguage[] {
  return [...languages].sort((a, b) => {
    if (b.sector_tier !== a.sector_tier) return b.sector_tier - a.sector_tier
    if (Math.abs(b.xp_share - a.xp_share) > 1e-9) return b.xp_share - a.xp_share
    return a.sort_order - b.sort_order
  })
}

/**
 * Build a deterministic scene model from factory API response.
 * Central campus: largest district at center; others in a compact ring.
 * Same seed_key => same layout every render.
 */
export function buildFactoryScene(factory: FactoryResponse): FactorySceneModel {
  const { factory_meta, languages } = factory
  const worldTheme = getThemeFromLabel(factory_meta.environment_label)

  if (languages.length === 0) {
    return {
      worldTheme,
      mapSize: MAP_SIZE,
      districts: [],
      upgrades: [],
      anchorIndex: 0,
    }
  }

  const ordered = orderLanguagesBySize(languages)
  const anchorIndex = languages.indexOf(ordered[0])
  const anchor = ordered[0]
  const anchorRadius = seededRadius(anchor.seed_key, anchor.sector_tier, anchor.xp_share)

  const districts: DistrictPlacement[] = []
  // Central campus: largest district at map center
  districts.push({
    language: anchor,
    x: CENTER_X,
    y: CENTER_Y,
    radius: anchorRadius,
    variant: seededVariant(anchor.seed_key, 'v', 4),
  })

  const n = ordered.length
  // Compact ring: moderate distance so districts feel like one campus
  const orbitRadius = 78

  for (let i = 1; i < n; i++) {
    const lang = ordered[i]
    const r = seededRadius(lang.seed_key, lang.sector_tier, lang.xp_share)
    const angle = seededAngle(lang.seed_key, i)
    const x = CENTER_X + Math.cos(angle) * orbitRadius
    const y = CENTER_Y + Math.sin(angle) * orbitRadius
    districts.push({
      language: lang,
      x,
      y,
      radius: r,
      variant: seededVariant(lang.seed_key, 'v', 4),
    })
  }

  // Upgrade placements: spread around campus, deterministic from first seed
  const masterSeed = languages[0].seed_key
  const upgradeIds = factory_meta.unlocked_upgrades
  const upgrades: UpgradePlacement[] = []
  const upgradeRadius = orbitRadius + 75
  upgradeIds.forEach((id, idx) => {
    const angle = seededAngle(masterSeed + id, idx + 100)
    const x = CENTER_X + Math.cos(angle) * upgradeRadius
    const y = CENTER_Y + Math.sin(angle) * upgradeRadius
    upgrades.push({
      id,
      x,
      y,
      variant: seededVariant(masterSeed, 'u:' + id, 3),
    })
  })

  return {
    worldTheme,
    mapSize: MAP_SIZE,
    districts,
    upgrades,
    anchorIndex,
  }
}
