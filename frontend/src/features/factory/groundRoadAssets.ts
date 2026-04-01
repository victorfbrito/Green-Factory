import type { RoadTileType } from '../../lib/procedural'

import grassBase from '../../assets/ground/grass/grass-base.svg?url'

import roadCross from '../../assets/ground/road/road-cross.svg?url'
import roadEnd from '../../assets/ground/road/road-end.svg?url'
import roadLshaped from '../../assets/ground/road/road-lshaped.svg?url'
import roadStraight from '../../assets/ground/road/road-straight.svg?url'
import roadTshaped from '../../assets/ground/road/road-tshaped.svg?url'

import laneCross from '../../assets/ground/lane/lane-cross.svg?url'
import laneEnd from '../../assets/ground/lane/lane-end.svg?url'
import laneLshaped from '../../assets/ground/lane/lane-lshaped.svg?url'
import laneStraight from '../../assets/ground/lane/lane-straight.svg?url'
import laneTshaped from '../../assets/ground/lane/lane-tshaped.svg?url'

/** Maps logical tile type to asset file (L-shaped art for corners). */
const ROAD_BY_TYPE: Record<RoadTileType, string> = {
  end: roadEnd,
  straight: roadStraight,
  corner: roadLshaped,
  t: roadTshaped,
  cross: roadCross,
}

const LANE_BY_TYPE: Record<RoadTileType, string> = {
  end: laneEnd,
  straight: laneStraight,
  corner: laneLshaped,
  t: laneTshaped,
  cross: laneCross,
}

export function groundRoadTextureUrl(kind: 'road' | 'service_lane', tileType: RoadTileType): string {
  return kind === 'road' ? ROAD_BY_TYPE[tileType] : LANE_BY_TYPE[tileType]
}

/** Live mode: one grass tile per cell, full grid. */
export const grassBaseTextureUrl = grassBase
