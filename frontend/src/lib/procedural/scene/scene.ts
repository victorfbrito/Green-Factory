/**
 * Stage A: Scene layout.
 * District anchors and scene positions only. No territory or roads.
 */

import type { FactoryResponse, FactoryLanguage } from '../../../types'
import { seededAngle, seededRadius, seededVariant } from '../seed'
import type { SceneLayout, WorldThemeId, DistrictPlacement, UpgradePlacement } from './types'

const MAP_SIZE = 840
const CENTER_X = MAP_SIZE / 2
const CENTER_Y = MAP_SIZE / 2

function getThemeFromLabel(label: string): WorldThemeId {
  switch (label) {
    case 'industrial':
    case 'improving':
    case 'sustainable':
    case 'advanced_green':
    case 'regenerative':
      return label
    default:
      return 'industrial'
  }
}

function orderLanguagesBySize(languages: FactoryLanguage[]): FactoryLanguage[] {
  return [...languages].sort((a, b) => {
    if (b.sector_tier !== a.sector_tier) return b.sector_tier - a.sector_tier
    if (Math.abs(b.xp_share - a.xp_share) > 1e-9) return b.xp_share - a.xp_share
    return a.sort_order - b.sort_order
  })
}

/**
 * Build scene layout from factory API response.
 * Deterministic: same FactoryResponse => same layout.
 */
export function buildSceneLayout(factory: FactoryResponse): SceneLayout {
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
  districts.push({
    language: anchor,
    x: CENTER_X,
    y: CENTER_Y,
    radius: anchorRadius,
    variant: seededVariant(anchor.seed_key, 'v', 4),
  })

  const orbitRadius = 78
  for (let i = 1; i < ordered.length; i++) {
    const lang = ordered[i]
    const r = seededRadius(lang.seed_key, lang.sector_tier, lang.xp_share)
    const angle = seededAngle(lang.seed_key, i)
    districts.push({
      language: lang,
      x: CENTER_X + Math.cos(angle) * orbitRadius,
      y: CENTER_Y + Math.sin(angle) * orbitRadius,
      radius: r,
      variant: seededVariant(lang.seed_key, 'v', 4),
    })
  }

  const upgradeIds = factory_meta.unlocked_upgrades
  const upgrades: UpgradePlacement[] = []
  const upgradeRadius = orbitRadius + 75
  const masterSeed = languages[0].seed_key
  upgradeIds.forEach((id, idx) => {
    const angle = seededAngle(masterSeed + id, idx + 100)
    upgrades.push({
      id,
      x: CENTER_X + Math.cos(angle) * upgradeRadius,
      y: CENTER_Y + Math.sin(angle) * upgradeRadius,
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
