/**
 * Deterministic helpers from seed_key.
 * Same payload => same layout.
 */

/** Simple string hash to number (djb2). */
export function hashSeed(seedKey: string): number {
  let h = 5381
  for (let i = 0; i < seedKey.length; i++) {
    h = ((h << 5) + h) ^ seedKey.charCodeAt(i)
  }
  return h >>> 0
}

/** Seeded pseudo-random in [0, 1). */
export function seededUnit(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000
  return x - Math.floor(x)
}

/** Deterministic [0, 1) from seed_key + suffix. */
export function seeded(seedKey: string, suffix: string): number {
  return seededUnit(hashSeed(seedKey + ':' + suffix))
}

/** Angle in radians [0, 2π) for index, derived from seed. */
export function seededAngle(seedKey: string, index: number): number {
  const h = hashSeed(seedKey + ':' + index)
  return seededUnit(h) * Math.PI * 2
}

/** Radius for a district: tier + xp_share influence, deterministic. */
export function seededRadius(seedKey: string, tier: number, share: number): number {
  const h = hashSeed(seedKey + ':r')
  const jitter = seededUnit(h) * 0.15 + 0.925 // small variation 0.925..1.075
  const base = 28 + tier * 18 + share * 24
  return Math.max(32, Math.min(120, base * jitter))
}

/** Integer variant for visuals (e.g. which decoration), 0..max-1. */
export function seededVariant(seedKey: string, prefix: string, max: number): number {
  const h = hashSeed(seedKey + ':' + prefix)
  return Math.floor(seededUnit(h) * max) % max
}
