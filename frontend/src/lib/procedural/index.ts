/**
 * Procedural factory generation. Modular layered architecture.
 *
 * Pipeline: FactoryResponse => buildFactoryRenderModel => FactoryRenderModel
 *
 * Stages:
 * A. Scene layout (district anchors)
 * B. Territory generation
 * C. Compound layout
 * D. Building layer (blocks)
 * E. Path layer
 * F. Service lane layer
 * G. Render model assembly
 */

export { hashSeed, seeded, seededAngle, seededRadius, seededUnit, seededVariant } from './seed'

export { buildFactoryRenderModel } from './render-model/buildFactoryRenderModel'

export {
  buildSceneLayout,
} from './scene/scene'
export type { SceneLayout, DistrictPlacement, UpgradePlacement, WorldThemeId } from './scene/types'
export type { FactoryRenderModel } from './render-model/buildFactoryRenderModel'

export { getTerritoryBudget, growTerritory, getTerritoryBorderCells, MIN_TERRITORY_BY_TIER } from './territory/territory'

export {
  MAP_SIZE,
  CELL_SIZE,
  GRID_SIZE,
  worldToCell,
  cellToWorld,
  cellKey,
} from './grid'

export type { Block } from './buildings/blocks'
export type { PathCell } from './navigation/paths'
export type { CompoundShapeId } from './compounds/compoundShapes'
