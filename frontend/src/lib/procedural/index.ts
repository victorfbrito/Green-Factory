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

export { getTerritoryBudgetForBlocks, growTerritory, getTerritoryBorderCells } from './territory/territory'

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
export type { CompoundDrawable, CompoundsToDrawablesContext } from './buildings/drawables'
export type { CompoundSemantic, CompoundCategory, CompoundDefinition } from '../factory/compoundRegistry'
export type { CompoundVisualHints } from '../factory/compoundVisuals'
export type { PathCell } from './navigation/paths'

export {
  applyGroundSvgArtRotation,
  autotileRoadNetwork,
  T_JUNCTION_SVG_ROTATION_BY_MASK,
  coordsToCellKey,
  getDeterministicVariant,
  getRoadMask,
  maskToTile,
  parseCellKey,
  roadDescriptorsToMap,
  ROAD_MASK_E,
  ROAD_MASK_N,
  ROAD_MASK_S,
  ROAD_MASK_W,
} from './roads/autotileRoads'
export type {
  AutotileRoadInput,
  AutotileRoadResult,
  CellKey,
  GridCellRef,
  RoadTileDescriptor,
  RoadTileType,
} from './roads/autotileRoads'
export type { CompoundShapeId } from './compounds/compoundShapes'
