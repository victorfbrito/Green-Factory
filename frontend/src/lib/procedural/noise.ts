/**
 * Deterministic 2D noise for territory growth and parcel fill.
 * Same seed_key + coords => same value. No external dependency.
 */

import { hashSeed, seededUnit } from './seed'

/** Smoothstep for interpolation (0 at 0, 1 at 1, smooth in between). */
function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

/** Hash two integers into a deterministic [0, 1) value. */
function hash2(seed: number, ix: number, iy: number): number {
  const h = ((seed ^ (ix * 73856093) ^ (iy * 19349663)) >>> 0) % 1e9
  return seededUnit(h)
}

export interface SeededNoise {
  /** Sample noise at (x, y). Returns value in [0, 1]. Deterministic for same seed and coords. */
  sample(x: number, y: number): number
}

/**
 * Create a deterministic noise sampler from seed_key.
 * Use world-grid coordinates (e.g. cx, cy) scaled by a factor for frequency control.
 */
export function createSeededNoise(seedKey: string): SeededNoise {
  const seed = hashSeed(seedKey + ':noise')

  return {
    sample(x: number, y: number): number {
      const ix = Math.floor(x)
      const iy = Math.floor(y)
      const fx = x - ix
      const fy = y - iy
      const u = smoothstep(fx)
      const v = smoothstep(fy)
      const n00 = hash2(seed, ix, iy)
      const n10 = hash2(seed, ix + 1, iy)
      const n01 = hash2(seed, ix, iy + 1)
      const n11 = hash2(seed, ix + 1, iy + 1)
      const nx0 = n00 * (1 - u) + n10 * u
      const nx1 = n01 * (1 - u) + n11 * u
      return nx0 * (1 - v) + nx1 * v
    },
  }
}

/** Scale factor for territory growth: larger = smoother, more coherent bias. */
export const TERRITORY_NOISE_SCALE = 0.22

/** How much noise affects growth priority vs distance. Higher = more organic edges. */
export const TERRITORY_NOISE_WEIGHT = 2.5

/**
 * Combined priority for claiming a cell: lower value = claim first.
 * Distance dominates; noise modulates (higher noise = more attractive).
 */
export function getTerritoryGrowthPriority(
  manhattanDist: number,
  noiseValue: number,
  distanceWeight: number = 1,
  noiseWeight: number = TERRITORY_NOISE_WEIGHT
): number {
  return distanceWeight * manhattanDist - noiseWeight * noiseValue
}

/**
 * Whether to consider a cell for building (vs leave as empty/gap).
 * Low noise => prefer empty; high noise => prefer parcel.
 */
export function getParcelFillDecision(noiseValue: number, fillThreshold: number = 0.32): boolean {
  return noiseValue > fillThreshold
}
