/**
 * Procedural factory generation. Modular layered architecture.
 *
 * Pipeline: FactoryResponse => buildFactoryRenderModel => FactoryRenderModel
 *
 * Stages:
 * A. Scene layout (district anchors)
 * B. Compound count from language → block grouping (territory expands to fit, compound-driven)
 * C. Block placement (sized for block plan, connected graph, 1-cell lanes) → territory derived from placement
 * D. Compound packing (target count per block, no overlap)
 * E. Building layer (occupancy from compounds)
 * F. Path layer (hub ↔ entrance)
 * G. Service lane layer (block lanes + entrance connection)
 * H. Render model assembly
 */

export { hashSeed, seeded, seededAngle, seededRadius, seededUnit, seededVariant } from './seed'

export { buildFactoryRenderModel } from './render-model/buildFactoryRenderModel'

export {
  buildSceneLayout,
} from './scene/scene'
export type { SceneLayout, DistrictPlacement, UpgradePlacement, WorldThemeId } from './scene/types'
export type { FactoryRenderModel } from './render-model/buildFactoryRenderModel'

export { getTerritoryBudget, getTerritoryBudgetForBlocks, growTerritory, getTerritoryBorderCells, MIN_TERRITORY_BY_TIER } from './territory/territory'
export { getCompoundCountFromLanguage } from './compounds/compoundCount'

export {
  MAP_SIZE,
  CELL_SIZE,
  GRID_SIZE,
  worldToCell,
  cellToWorld,
  cellKey,
} from './grid'

export type { Compound } from './compounds/compoundExtract'
export type { Block } from './blocks/blockFormation'
export type { CompoundDrawable } from './buildings/drawables'
export type { PathCell } from './navigation/paths'
export type { CompoundShapeId } from './compounds/compoundShapes'
