/**
 * Convert Compounds to drawable rectangles for rendering.
 * One drawable per compound. Used by ThreeWorldLayer.
 */

import { hashSeed, seededUnit } from '../seed'
import { compoundToWorld } from '../compounds/compoundExtract'
import type { Compound } from '../compounds/compoundExtract'

export interface CompoundDrawable {
  x: number
  y: number
  w: number
  h: number
  shade: number
  isLandmark?: boolean
  /** Height level (0–3) for vertical grid; each compound in district gets different level */
  heightLevel: number
}

const NUM_HEIGHT_LEVELS = 4

/**
 * Convert compounds to drawables for rendering.
 * Deterministic: same compounds + seedKey => same drawables.
 * Each compound in a district gets a different heightLevel (0–3) for stepped vertical variety.
 */
export function compoundsToDrawables(compounds: Compound[], seedKey: string): CompoundDrawable[] {
  return compounds.map((c, index) => {
    const world = compoundToWorld(c)
    const r = c.isLandmark ? 0.95 : 0.9 + seededUnit(hashSeed(seedKey + ':' + c.cx + ',' + c.cy)) * 0.12
    const heightLevel = index % NUM_HEIGHT_LEVELS
    return {
      x: world.x,
      y: world.y,
      w: world.w,
      h: world.h,
      shade: r,
      isLandmark: c.isLandmark,
      heightLevel,
    }
  })
}
