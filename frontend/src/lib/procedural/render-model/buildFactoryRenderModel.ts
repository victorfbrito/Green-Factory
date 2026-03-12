/**
 * Stage G: Render model assembly.
 * Combines districts, blocks, paths, service lanes, upgrades into one clean render model.
 */

import type { FactoryResponse } from '../../../types'
import { buildSceneLayout } from '../scene/scene'
import type { DistrictPlacement } from '../scene/types'
import { getTerritoryBudget, growTerritory, getTerritoryBorderCells } from '../territory/territory'
import { layoutCompoundsInTerritory } from '../compounds/compoundLayout'
import { compoundsToBlocks } from '../buildings/blocks'
import { getBuildingOccupancy } from '../buildings/buildingGrid'
import { buildNavGrid } from '../navigation/navGrid'
import { buildPaths } from '../navigation/paths'
import { buildServiceLanes } from '../navigation/serviceLanes'
import { cellKey, worldToCell } from '../grid'
import type { Block } from '../buildings/blocks'
import type { PathCell } from '../navigation/paths'
import type { WorldThemeId } from '../scene/types'

export interface FactoryRenderModel {
  worldTheme: WorldThemeId
  mapSize: number
  districts: DistrictPlacement[]
  blockLists: Block[][]
  paths: PathCell[][]
  serviceLaneCells: PathCell[]
  borderCellsByDistrict: [number, number][][]
  upgrades: { id: string; x: number; y: number; variant: number }[]
  anchorIndex: number
}

/**
 * Full pipeline: FactoryResponse => FactoryRenderModel.
 * A. Scene layout
 * B. Territory generation
 * C. Compound layout
 * D. Building layer (blocks)
 * E. Path layer
 * F. Service lane layer
 * G. Render model assembly
 */
export function buildFactoryRenderModel(factory: FactoryResponse): FactoryRenderModel {
  const scene = buildSceneLayout(factory)
  const { districts, upgrades, anchorIndex, worldTheme, mapSize } = scene

  if (districts.length === 0) {
    return {
      worldTheme,
      mapSize,
      districts: [],
      blockLists: [],
      paths: [],
      serviceLaneCells: [],
      borderCellsByDistrict: [],
      upgrades,
      anchorIndex,
    }
  }

  // B. Territory generation
  const occupied = new Set<string>()
  const anchorCellsByIndex = districts.map((d) => cellKey(...worldToCell(d.x, d.y)))
  const budgets = districts.map((d) => getTerritoryBudget(d.language.sector_tier, d.language.xp_share, d.language.seed_key))
  const byBudgetDesc = districts.map((_, i) => i).sort((a, b) => budgets[b] - budgets[a] || a - b)
  const territoryByIndex: [number, number][][] = districts.map(() => [])

  for (const i of byBudgetDesc) {
    const d = districts[i]
    const budget = budgets[i]
    const protectedCells = new Set<string>()
    for (let j = 0; j < districts.length; j++) if (j !== i) protectedCells.add(anchorCellsByIndex[j])
    const territory = growTerritory(d.x, d.y, budget, occupied, d.language.seed_key, protectedCells)
    territoryByIndex[i] = territory
  }

  // C. Compound layout + D. Building layer
  const blockLists: Block[][] = []
  const allBlocked = new Set<string>()

  for (let i = 0; i < districts.length; i++) {
    const territory = territoryByIndex[i]
    const seedKey = districts[i].language.seed_key
    const isPrimary = i === anchorIndex
    const buildingCells = layoutCompoundsInTerritory(territory, seedKey, isPrimary)
    const blocks = compoundsToBlocks(buildingCells, territory, seedKey, isPrimary)
    blockLists.push(blocks)
    for (const k of getBuildingOccupancy(blocks)) {
      allBlocked.add(k)
    }
  }

  // E. Path layer
  const pathResult = buildPaths(districts, blockLists, allBlocked)

  // F. Service lane layer
  const grid = buildNavGrid(allBlocked)
  const districtAnchors = districts.map((d) => {
    const [cx, cy] = worldToCell(d.x, d.y)
    return { cx, cy }
  })
  const serviceLaneCells = buildServiceLanes(grid, pathResult.paths, pathResult.entrances, districtAnchors)

  // G. Assembly
  const borderCellsByDistrict = territoryByIndex.map((t) => getTerritoryBorderCells(t))

  return {
    worldTheme,
    mapSize,
    districts,
    blockLists,
    paths: pathResult.paths,
    serviceLaneCells,
    borderCellsByDistrict,
    upgrades,
    anchorIndex,
  }
}
