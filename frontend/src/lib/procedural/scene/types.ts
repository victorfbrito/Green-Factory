/**
 * Scene layout types. Aligned with GLOSSARY.md.
 */

import type { FactoryLanguage } from '../../../types'

/** Environment level → theme id for styling. */
export type WorldThemeId =
  | 'industrial'
  | 'improving'
  | 'sustainable'
  | 'advanced_green'
  | 'regenerative'

/** District – One language zone. Has an anchor (x, y) and radius; no direct shape on canvas. */
export interface DistrictPlacement {
  language: FactoryLanguage
  x: number
  y: number
  radius: number
  variant: number
}

export interface UpgradePlacement {
  id: string
  x: number
  y: number
  variant: number
}

/** Scene layout: district anchors and upgrades only. No territory or roads. */
export interface SceneLayout {
  worldTheme: WorldThemeId
  mapSize: number
  districts: DistrictPlacement[]
  upgrades: UpgradePlacement[]
  anchorIndex: number
}
