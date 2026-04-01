/**
 * Deterministic road autotiling (post-process only).
 * Converts occupied road / service-lane cells into tile descriptors (SVG + rotation).
 * Pathfinding is unchanged; this layer only interprets 4-neighbor connectivity.
 *
 * @example
 * ```ts
 * import { cellKey } from '../grid'
 * import { autotileRoadNetwork } from './roads/autotileRoads'
 *
 * // After layout: path cells from A*, service lane cells from district logic
 * const roadCells = new Set(paths.flat().map((c) => cellKey(c.cx, c.cy)))
 * const serviceLaneCells = new Set(serviceLanePaths.flat().map(([x, y]) => cellKey(x, y)))
 *
 * const { descriptors, byKey } = autotileRoadNetwork({
 *   roadCells,
 *   serviceLaneCells,
 *   variantCount: 3,
 *   seedKey: factorySeed,
 * })
 * // Render: for each descriptor, pick SVG by kind + tileType, apply rotation
 * // (road vs lane connectivity are separate — masks do not cross layers)
 * ```
 */

import { cellKey } from '../grid'
import { seededVariant } from '../seed'

/** N=1, E=2, S=4, W=8 — cardinal bits for neighbor connectivity */
export const ROAD_MASK_N = 1
export const ROAD_MASK_E = 2
export const ROAD_MASK_S = 4
export const ROAD_MASK_W = 8

export type RoadTileType = 'end' | 'straight' | 'corner' | 't' | 'cross'

export type CellKey = string

export interface GridCellRef {
  x: number
  y: number
  key: string
}

export interface RoadTileDescriptor {
  key: string
  x: number
  y: number
  kind: 'road' | 'service_lane'
  mask: number
  tileType: RoadTileType
  rotation: 0 | 90 | 180 | 270
  variant: number
}

export interface AutotileRoadInput {
  roadCells: Set<string>
  serviceLaneCells: Set<string>
  /** Visual variant index in [0, variantCount). Default 3. */
  variantCount?: number
  /** Base string for deterministic variant hashing. */
  seedKey?: string
}

export interface AutotileRoadResult {
  /** Stable order: ascending y, then x. */
  descriptors: RoadTileDescriptor[]
  byKey: Map<string, RoadTileDescriptor>
}

/** `"cx,cy"` → coordinates. Returns null if the string is not two comma-separated numbers. */
export function parseCellKey(key: string): { x: number; y: number } | null {
  const i = key.indexOf(',')
  if (i <= 0) return null
  const x = Number(key.slice(0, i))
  const y = Number(key.slice(i + 1))
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return { x, y }
}

/** Same as `cellKey` from grid; kept here for a single roads-module API. */
export function coordsToCellKey(x: number, y: number): string {
  return cellKey(x, y)
}

/**
 * 4-neighbor mask: set a bit if that cardinal neighbor’s cell key is in `occupied`.
 * Pass only the **same-layer** cell set (roads-only or service-lane-only); layers do not connect.
 * N=(x,y-1), E=(x+1,y), S=(x,y+1), W=(x-1,y)
 */
export function getRoadMask(x: number, y: number, occupied: Set<string>): number {
  let m = 0
  if (occupied.has(coordsToCellKey(x, y - 1))) m |= ROAD_MASK_N
  if (occupied.has(coordsToCellKey(x + 1, y))) m |= ROAD_MASK_E
  if (occupied.has(coordsToCellKey(x, y + 1))) m |= ROAD_MASK_S
  if (occupied.has(coordsToCellKey(x - 1, y))) m |= ROAD_MASK_W
  return m
}

/**
 * Map 4-bit mask → canonical tile archetype + rotation (degrees).
 *
 * Bit layout: N=1, E=2, S=4, W=8.
 * - Ends (single bit): open side points along +rotation from default “cap up”.
 * - Straights: 5 = N|S, 10 = E|W
 * - Corners: 3 NE, 6 ES, 12 SW, 9 WN (clockwise around the bend)
 * - T: masks **7, 11, 13, 14** use rotations **0°, 90°, 180°, 270°** in numeric mask order (geometry
 *   index only). Final on-screen angle for `*-tshaped.svg` is in `T_JUNCTION_SVG_ROTATION_BY_MASK`.
 * - Cross: 15
 *
 * mask 0: isolated cell — unexpected in a connected graph; treat as end @ 0° (fallback).
 */
export function maskToTile(mask: number): { tileType: RoadTileType; rotation: 0 | 90 | 180 | 270 } {
  switch (mask) {
    case 0:
      // Isolated road cell or bad data: still render something stable.
      return { tileType: 'end', rotation: 0 }
    case 1:
      return { tileType: 'end', rotation: 0 }
    case 2:
      return { tileType: 'end', rotation: 90 }
    case 4:
      return { tileType: 'end', rotation: 180 }
    case 8:
      return { tileType: 'end', rotation: 270 }
    case 5:
      return { tileType: 'straight', rotation: 0 }
    case 10:
      return { tileType: 'straight', rotation: 90 }
    case 3:
      return { tileType: 'corner', rotation: 0 }
    case 6:
      return { tileType: 'corner', rotation: 90 }
    case 12:
      return { tileType: 'corner', rotation: 180 }
    case 9:
      return { tileType: 'corner', rotation: 270 }
    case 7:
      return { tileType: 't', rotation: 0 }
    case 11:
      return { tileType: 't', rotation: 90 }
    case 13:
      return { tileType: 't', rotation: 180 }
    case 14:
      return { tileType: 't', rotation: 270 }
    case 15:
      return { tileType: 'cross', rotation: 0 }
    default:
      // Defensive: any unexpected mask (should not occur with 4-bit topology)
      return { tileType: 'end', rotation: 0 }
  }
}

/** Deterministic index in [0, variantCount) from cell + seed. */
export function getDeterministicVariant(
  x: number,
  y: number,
  variantCount: number,
  seedKey: string
): number {
  const n = Math.max(1, variantCount)
  if (n <= 1) return 0
  return seededVariant(seedKey, `autotile:${x},${y}`, n)
}

/** Road layer wins if a cell appears in both sets. */
function cellKind(key: string, roadCells: Set<string>): 'road' | 'service_lane' {
  if (roadCells.has(key)) return 'road'
  return 'service_lane'
}

function flipRotation180(rotation: 0 | 90 | 180 | 270): 0 | 90 | 180 | 270 {
  return ((rotation + 180) % 360) as 0 | 90 | 180 | 270
}

/**
 * `maskToTile` uses 0°→270° in mask order (7,11,13,14) as a tidy index; this table is the actual
 * mesh rotation for `road-tshaped.svg` / `lane-tshaped.svg` (same for road and lane).
 * Tune here when art changes — keep {@link maskToTile} T rows in 0/90/180/270 order only.
 */
export const T_JUNCTION_SVG_ROTATION_BY_MASK: Record<number, 0 | 90 | 180 | 270> = {
  7: 270,
  11: 0,
  13: 90,
  14: 180,
}

/**
 * Single source of truth for how `road-*` / `lane-*` SVG art aligns with `maskToTile` geometry.
 * Same rules for **road** and **service_lane** — only the asset path differs by `kind`.
 *
 * - **end**: E (2) or W (8) single-neighbor → +180°
 * - **corner**: E+S (6), W+N (9) → +180°
 * - **t**: use {@link T_JUNCTION_SVG_ROTATION_BY_MASK} (ignores `rotation` from `maskToTile` for T)
 */
export function applyGroundSvgArtRotation(
  tileType: RoadTileType,
  mask: number,
  rotation: 0 | 90 | 180 | 270
): 0 | 90 | 180 | 270 {
  switch (tileType) {
    case 'end':
      if (mask === ROAD_MASK_E || mask === ROAD_MASK_W) return flipRotation180(rotation)
      return rotation
    case 'corner':
      if (mask === 6 || mask === 9) return flipRotation180(rotation)
      return rotation
    case 't': {
      const r = T_JUNCTION_SVG_ROTATION_BY_MASK[mask]
      return r !== undefined ? r : rotation
    }
    default:
      return rotation
  }
}

/**
 * Build tile descriptors for every cell in roadCells ∪ serviceLaneCells.
 * **Masks are independent per layer:** road tiles use only `roadCells` for neighbors; service-lane
 * tiles use only `serviceLaneCells`. A road next to a service lane does not affect either mask.
 * `kind` is road if the key is in `roadCells`, else service lane (road wins if both).
 */
export function autotileRoadNetwork(input: AutotileRoadInput): AutotileRoadResult {
  const { roadCells, serviceLaneCells, variantCount: rawVariant = 3, seedKey = 'road-autotile' } = input
  const variantCount = Math.max(1, rawVariant)

  const combined = new Set<string>([...roadCells, ...serviceLaneCells])

  const refs: GridCellRef[] = []
  for (const key of combined) {
    const p = parseCellKey(key)
    if (!p) continue
    refs.push({ key, x: p.x, y: p.y })
  }

  refs.sort((a, b) => a.y - b.y || a.x - b.x)

  const descriptors: RoadTileDescriptor[] = []
  const byKey = new Map<string, RoadTileDescriptor>()

  for (const { key, x, y } of refs) {
    const kind = cellKind(key, roadCells)
    const occupiedForMask = kind === 'road' ? roadCells : serviceLaneCells
    const mask = getRoadMask(x, y, occupiedForMask)
    const mapped = maskToTile(mask)
    const rotation = applyGroundSvgArtRotation(mapped.tileType, mask, mapped.rotation)
    const variant = getDeterministicVariant(x, y, variantCount, seedKey)

    const d: RoadTileDescriptor = {
      key,
      x,
      y,
      kind,
      mask,
      tileType: mapped.tileType,
      rotation,
      variant,
    }
    descriptors.push(d)
    byKey.set(key, d)
  }

  return { descriptors, byKey }
}

/** Convenience: lookup map from an existing descriptor list (same keys). */
export function roadDescriptorsToMap(descriptors: RoadTileDescriptor[]): Map<string, RoadTileDescriptor> {
  const m = new Map<string, RoadTileDescriptor>()
  for (const d of descriptors) m.set(d.key, d)
  return m
}
