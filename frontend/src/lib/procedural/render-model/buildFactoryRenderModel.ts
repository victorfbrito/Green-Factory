/**
 * Stage G: Render model assembly.
 * Pipeline: block-first placement → compound packing → building layer → paths → service lanes.
 */

import type { FactoryResponse } from '../../../types'
import { assignSemanticsToBlockCompounds, deriveSectorTier } from '../../factory/compoundSelection'
import { buildSceneLayout } from '../scene/scene'
import type { DistrictPlacement } from '../scene/types'
import { getTerritoryBorderCells } from '../territory/territory'
import { getPlannedBlockCapacities, groupCompoundsIntoBlocks } from '../blocks/blockGrouping'
import { placeBlocks, getBlockCellsFromFootprints } from '../blocks/blockPlacement'
import { packCompoundsInBlock } from '../compounds/compoundPacking'
import { compoundsToDrawables } from '../buildings/drawables'
import { cellKey, GRID_SIZE, worldToCell } from '../grid'
import { compoundToWorld, getCompoundCells, type Compound } from '../compounds/compoundExtract'
import type { Block } from '../blocks/blockFormation'
import type { CompoundDrawable } from '../buildings/drawables'
import type { PathCell } from '../navigation/paths'
import type { WorldThemeId } from '../scene/types'
import type { BlockFootprint } from '../blocks/blockPlacement'

export interface FactoryRenderModel {
  worldTheme: WorldThemeId
  mapSize: number
  districts: DistrictPlacement[]
  compoundDrawables: CompoundDrawable[][]
  nextCompoundDrawables: { x: number; y: number; w: number; h: number }[][]
  treeCells: PathCell[]
  blockLists: Block[][]
  paths: PathCell[][]
  serviceLaneCells: PathCell[]
  borderCellsByDistrict: [number, number][][]
  territoryCellsByDistrict: [number, number][][]
  upgrades: { id: string; x: number; y: number; variant: number }[]
  anchorIndex: number
}

function getRoadCellsAroundFootprint(footprint: BlockFootprint): PathCell[] {
  const roadCells: PathCell[] = []
  for (let cx = footprint.cx - 1; cx <= footprint.cx + footprint.w; cx++) {
    for (let cy = footprint.cy - 1; cy <= footprint.cy + footprint.h; cy++) {
      const isInsideBlock =
        cx >= footprint.cx &&
        cx < footprint.cx + footprint.w &&
        cy >= footprint.cy &&
        cy < footprint.cy + footprint.h

      if (isInsideBlock) continue
      if (cx < 0 || cy < 0 || cx >= GRID_SIZE || cy >= GRID_SIZE) continue

      roadCells.push({ cx, cy })
    }
  }
  return roadCells
}

function getRoadCellsAroundFootprints(footprints: BlockFootprint[]): PathCell[] {
  const seen = new Set<string>()
  const roadCells: PathCell[] = []

  for (const footprint of footprints) {
    for (const cell of getRoadCellsAroundFootprint(footprint)) {
      const key = cellKey(cell.cx, cell.cy)
      if (seen.has(key)) continue
      seen.add(key)
      roadCells.push(cell)
    }
  }

  return roadCells
}

function getInteriorFreeCells(
  footprints: BlockFootprint[],
  compounds: Compound[],
  nextCompounds: Compound[]
): PathCell[] {
  const occupied = new Set<string>()
  const freeCells: PathCell[] = []
  const seen = new Set<string>()

  for (const compound of compounds) {
    for (const key of getCompoundCells(compound)) occupied.add(key)
  }
  for (const compound of nextCompounds) {
    for (const key of getCompoundCells(compound)) occupied.add(key)
  }

  for (const footprint of footprints) {
    for (let dx = 0; dx < footprint.w; dx++) {
      for (let dy = 0; dy < footprint.h; dy++) {
        const cx = footprint.cx + dx
        const cy = footprint.cy + dy
        const key = cellKey(cx, cy)
        if (occupied.has(key) || seen.has(key)) continue
        seen.add(key)
        freeCells.push({ cx, cy })
      }
    }
  }

  return freeCells
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
      nextCompoundDrawables: [],
      treeCells: [],
      blockLists: [],
      paths: [],
      serviceLaneCells: [],
      borderCellsByDistrict: [],
      territoryCellsByDistrict: [],
      upgrades,
      anchorIndex,
    }
  }

  // B. Compound count from backend → block grouping (territory expands to fit, compound-driven)
  const compoundCounts = districts.map((d) => d.language.compound_count)
  console.log('[factory] compound counts by district:', compoundCounts.map((c, i) => ({ district: districts[i].language.language_name, count: c })))
  const blockSizesByDistrict = compoundCounts.map((count, i) =>
    groupCompoundsIntoBlocks(count, districts[i].language.seed_key)
  )
  const previewBlockSizesByDistrict = compoundCounts.map((count, i) =>
    groupCompoundsIntoBlocks(count + 1, districts[i].language.seed_key)
  )
  const plannedBlockCapacitiesByDistrict = compoundCounts.map((count) =>
    getPlannedBlockCapacities(count)
  )

  // Occupied = anchors + (territory + 1-cell buffer) from previous districts. Districts don't touch (incl. diagonal).
  const anchorCellsByIndex = districts.map((d) => cellKey(...worldToCell(d.x, d.y)))
  const layoutOrder = districts.map((_, i) => i)
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
  const blockLists: Block[][] = districts.map(() => [])
  const compoundDrawables: CompoundDrawable[][] = districts.map(() => [])
  const nextCompoundDrawables: { x: number; y: number; w: number; h: number }[][] = districts.map(() => [])
  const roadCellsByDistrict: PathCell[][] = districts.map(() => [])
  const treeCellsByDistrict: PathCell[][] = districts.map(() => [])

  for (const i of layoutOrder) {
    const blockSizes = blockSizesByDistrict[i]
    const previewBlockSizes = previewBlockSizesByDistrict[i]
    const plannedBlockCapacities = plannedBlockCapacitiesByDistrict[i]
    const seedKey = districts[i].language.seed_key
    const isPrimary = i === anchorIndex
    const [anchorCx, anchorCy] = worldToCell(districts[i].x, districts[i].y)

    const placement = placeBlocks(occupied, blockCellsAll, plannedBlockCapacities, anchorCx, anchorCy, seedKey)
    console.log('[factory] blocks placed:', districts[i].language.language_name, 'requested=', plannedBlockCapacities.length, 'placed=', placement.footprints.length, 'territory=', placement.territoryCells.length)
    territoryByIndex[i] = placement.territoryCells
    addCellsWithBuffer(placement.territoryCells, occupied)
    for (const k of getBlockCellsFromFootprints(placement.footprints)) blockCellsAll.add(k)

    const compounds: Compound[] = []
    const blocks: Block[] = []
    const nextCompounds: Compound[] = []
    const completeFootprints: BlockFootprint[] = []
    const completeBlockCompounds: Compound[] = []

    const districtTier = deriveSectorTier(districts[i].language, factory.languages)
    const isCurrent = districts[i].language.is_current

    for (let bi = 0; bi < placement.footprints.length; bi++) {
      const fp = placement.footprints[bi]
      const targetCount = blockSizes[bi] ?? 0
      const previewCount = previewBlockSizes[bi] ?? targetCount
      const plannedCapacity = plannedBlockCapacities[bi] ?? 0
      const blockCompounds = packCompoundsInBlock(fp, targetCount, seedKey, bi, isPrimary && bi === 0)
      assignSemanticsToBlockCompounds(blockCompounds, seedKey, districtTier, bi)
      compounds.push(...blockCompounds)
      if (blockCompounds.length > 0) {
        blocks.push({ compounds: blockCompounds })
      }
      if (targetCount >= plannedCapacity && plannedCapacity > 0) {
        completeFootprints.push(fp)
        completeBlockCompounds.push(...blockCompounds)
      }

      if (previewCount > targetCount) {
        const previewCompounds = packCompoundsInBlock(fp, previewCount, seedKey, bi, isPrimary && bi === 0)
        const nextCompound = previewCompounds[targetCount]
        if (nextCompound) {
          nextCompounds.push(nextCompound)
          nextCompoundDrawables[i].push(compoundToWorld(nextCompound))
        }
      }
    }

    console.log('[factory] compounds packed:', districts[i].language.language_name, 'total=', compounds.length)
    blockLists[i] = blocks
    compoundDrawables[i] = compoundsToDrawables(compounds, seedKey, {
      isCurrentDistrict: isCurrent,
      sectorTier: districtTier,
    })
    roadCellsByDistrict[i] = getRoadCellsAroundFootprints(placement.footprints)
    treeCellsByDistrict[i] = getInteriorFreeCells(completeFootprints, completeBlockCompounds, [])
  }

  // H. Assembly
  const borderCellsByDistrict = territoryByIndex.map((t) => getTerritoryBorderCells(t))
  const roadCells = roadCellsByDistrict.flat()
  const treeCells = treeCellsByDistrict.flat()

  return {
    worldTheme,
    mapSize,
    districts,
    compoundDrawables,
    nextCompoundDrawables,
    treeCells,
    blockLists,
    paths: [],
    serviceLaneCells: roadCells,
    borderCellsByDistrict,
    territoryCellsByDistrict: territoryByIndex,
    upgrades,
    anchorIndex,
  }
}
