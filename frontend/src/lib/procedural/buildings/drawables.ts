/**
 * Convert Compounds to drawable rectangles for rendering.
 * One drawable per compound. Used by ThreeWorldLayer.
 */

import type { CompoundSemantic } from '../../factory/compoundRegistry'
import { getCompoundVisualHints } from '../../factory/compoundVisuals'
import type { CompoundVisualHints } from '../../factory/compoundVisuals'
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
  semantic?: CompoundSemantic
  visualHints?: CompoundVisualHints
  /** Duolingo current course — boosts motion/glow hints only */
  isCurrentDistrict?: boolean
}

const NUM_HEIGHT_LEVELS = 4

export interface CompoundsToDrawablesContext {
  isCurrentDistrict: boolean
  sectorTier: 1 | 2 | 3 | 4 | 5
}

/**
 * Convert compounds to drawables for rendering.
 * Deterministic: same compounds + seedKey => same drawables.
 * Each compound in a district gets a different heightLevel (0–3) for stepped vertical variety.
 */
export function compoundsToDrawables(
  compounds: Compound[],
  seedKey: string,
  context: CompoundsToDrawablesContext
): CompoundDrawable[] {
  return compounds.map((c, index) => {
    const world = compoundToWorld(c)
    const r = c.isLandmark ? 0.95 : 0.9 + seededUnit(hashSeed(seedKey + ':' + c.cx + ',' + c.cy)) * 0.12
    const heightLevel = index % NUM_HEIGHT_LEVELS
    const sem = c.semantic
    const visualHints =
      sem !== undefined
        ? getCompoundVisualHints(
            sem.category,
            sem.animationType,
            context.sectorTier,
            context.isCurrentDistrict,
            c.isLandmark === true
          )
        : undefined
    const shadeBoost = context.isCurrentDistrict ? 1.08 : 1
    return {
      x: world.x,
      y: world.y,
      w: world.w,
      h: world.h,
      shade: Math.min(1.15, r * shadeBoost),
      isLandmark: c.isLandmark,
      heightLevel,
      semantic: sem,
      visualHints,
      isCurrentDistrict: context.isCurrentDistrict,
    }
  })
}
