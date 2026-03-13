/**
 * Stage G: Render model assembly.
 * Pipeline: block-first placement → compound packing → building layer → paths → service lanes.
 */

import type { FactoryResponse } from '../../../types'
import { buildSceneLayout } from '../scene/scene'
import type { DistrictPlacement } from '../scene/types'
import { getTerritoryBorderCells } from '../territory/territory'
import { getCompoundCountFromLanguage } from '../compounds/compoundCount'
import { splitCompoundsIntoBlocks } from '../blocks/blockGrouping'
import { placeBlocks, getBlockCellsFromFootprints } from '../blocks/blockPlacement'
import { packCompoundsInBlock } from '../compounds/compoundPacking'
import { getCompoundOccupancy } from '../buildings/occupancy'
import { compoundsToDrawables } from '../buildings/drawables'
import { buildNavGrid } from '../navigation/navGrid'
import { buildPaths } from '../navigation/paths'
import { buildServiceLanes } from '../navigation/serviceLanes'
import { cellKey, worldToCell } from '../grid'
import type { Compound } from '../compounds/compoundExtract'
import type { Block } from '../blocks/blockFormation'
import type { CompoundDrawable } from '../buildings/drawables'
import type { PathCell } from '../navigation/paths'
import type { WorldThemeId } from '../scene/types'

export interface FactoryRenderModel {
  worldTheme: WorldThemeId
  mapSize: number
  districts: DistrictPlacement[]
  compoundDrawables: CompoundDrawable[][]
  blockLists: Block[][]
  paths: PathCell[][]
  serviceLaneCells: PathCell[]
  borderCellsByDistrict: [number, number][][]
  upgrades: { id: string; x: number; y: number; variant: number }[]
  anchorIndex: number
}

/**
 * Full pipeline: FactoryResponse => FactoryRenderModel.
 * Block-first: place blocks as connected graph, pack compounds inside, then paths and service lanes.
 */
export function buildFactoryRenderModel(factory: FactoryResponse): FactoryRenderModel {
  const scene = buildSceneLayout(factory)
  const { districts, upgrades, anchorIndex, worldTheme, mapSize } = scene

  if (districts.length === 0) {
    return {
      worldTheme,
      mapSize,
      districts: [],
      compoundDrawables: [],
      blockLists: [],
      paths: [],
      serviceLaneCells: [],
      borderCellsByDistrict: [],
      upgrades,
      anchorIndex,
    }
  }

  // B. Compound count from language → block grouping (territory expands to fit, compound-driven)
  const compoundCounts = districts.map((d) =>
    getCompoundCountFromLanguage(d.language.xp, d.language.sector_tier, d.language.xp_share, d.language.seed_key)
  )
  console.log('[factory] compound counts by district:', compoundCounts.map((c, i) => ({ district: districts[i].language.language_name, count: c })))
  const blockSizesByDistrict = compoundCounts.map((count, i) =>
    splitCompoundsIntoBlocks(count, districts[i].language.seed_key)
  )

  // Occupied = anchors + (territory + 1-cell buffer) from previous districts. Districts don't touch (incl. diagonal).
  const anchorCellsByIndex = districts.map((d) => cellKey(...worldToCell(d.x, d.y)))
  const byCompoundCountDesc = districts.map((_, i) => i).sort((a, b) => compoundCounts[b] - compoundCounts[a] || a - b)
  const territoryByIndex: [number, number][][] = districts.map(() => [])
  let occupied = new Set<string>()
  for (let j = 0; j < districts.length; j++) occupied.add(anchorCellsByIndex[j])
  let blockCellsAll = new Set<string>()
  const NEIGHBORS_8: [number, number][] = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
  const addCellsWithBuffer = (cells: [number, number][], into: Set<string>) => {
    for (const [cx, cy] of cells) {
      into.add(cellKey(cx, cy))
      for (const [dx, dy] of NEIGHBORS_8) into.add(cellKey(cx + dx, cy + dy))
    }
  }

  // C. Block placement first (compound-driven) → territory expands to fit
  const compoundLists: Compound[][] = districts.map(() => [])
  const blockLists: Block[][] = districts.map(() => [])
  const compoundDrawables: CompoundDrawable[][] = districts.map(() => [])
  const blockLaneCellsByDistrict: { cx: number; cy: number }[][] = districts.map(() => [])
  const allBlocked = new Set<string>()

  for (const i of byCompoundCountDesc) {
    const blockSizes = blockSizesByDistrict[i]
    const seedKey = districts[i].language.seed_key
    const isPrimary = i === anchorIndex
    const [anchorCx, anchorCy] = worldToCell(districts[i].x, districts[i].y)

    const placement = placeBlocks(occupied, blockCellsAll, blockSizes, anchorCx, anchorCy, seedKey)
    console.log('[factory] blocks placed:', districts[i].language.language_name, 'requested=', blockSizes.length, 'placed=', placement.footprints.length, 'territory=', placement.territoryCells.length)
    territoryByIndex[i] = placement.territoryCells
    addCellsWithBuffer(placement.territoryCells, occupied)
    for (const k of getBlockCellsFromFootprints(placement.footprints)) blockCellsAll.add(k)

    const compounds: Compound[] = []
    const blocks: Block[] = []

    for (let bi = 0; bi < placement.footprints.length; bi++) {
      const fp = placement.footprints[bi]
      const targetCount = blockSizes[bi] ?? 1
      const blockCompounds = packCompoundsInBlock(fp, targetCount, seedKey, bi, isPrimary && bi === 0)
      compounds.push(...blockCompounds)
      blocks.push({ compounds: blockCompounds })
    }

    console.log('[factory] compounds packed:', districts[i].language.language_name, 'total=', compounds.length)
    compoundLists[i] = compounds
    blockLists[i] = blocks
    compoundDrawables[i] = compoundsToDrawables(compounds, seedKey)
    blockLaneCellsByDistrict[i] = placement.laneCells

    for (const k of getCompoundOccupancy(compounds)) {
      allBlocked.add(k)
    }
  }

  // F. Path layer
  const pathResult = buildPaths(districts, compoundLists, allBlocked)

  // G. Service lane layer (block lanes + entrance connection)
  const grid = buildNavGrid(allBlocked)
  const districtAnchors = districts.map((d) => {
    const [cx, cy] = worldToCell(d.x, d.y)
    return { cx, cy }
  })
  const serviceLaneCells = buildServiceLanes(
    grid,
    pathResult.paths,
    pathResult.entrances,
    districtAnchors,
    blockLaneCellsByDistrict
  )

  // H. Assembly
  const borderCellsByDistrict = territoryByIndex.map((t) => getTerritoryBorderCells(t))

  return {
    worldTheme,
    mapSize,
    districts,
    compoundDrawables,
    blockLists,
    paths: pathResult.paths,
    serviceLaneCells,
    borderCellsByDistrict,
    upgrades,
    anchorIndex,
  }
}
