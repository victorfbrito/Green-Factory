/**
 * Presentation hints for renderers (colors, emissive, future motion).
 * Maps category / animation / tier / current-course flags to lightweight flags—no heavy simulation.
 *
 * TODO: Hook these into materials, instancing, and optional shader pulses per animationType.
 */

import type { CompoundAnimationType, CompoundCategory } from './compoundRegistry'

export interface CompoundVisualHints {
  roofVariant: 'flat' | 'peaked' | 'dome' | 'sawtooth'
  accentVariant: 'none' | 'stripe' | 'corner' | 'band'
  motionIntensity: number
  highlightType: 'none' | 'rim' | 'pulse' | 'beacon'
  landmarkPresence: number
  hasAntenna: boolean
  hasTank: boolean
  hasConveyor: boolean
  hasGlow: boolean
  hasCrowd: boolean
}

const categoryBase = (
  category: CompoundCategory
): Pick<
  CompoundVisualHints,
  | 'roofVariant'
  | 'accentVariant'
  | 'hasAntenna'
  | 'hasTank'
  | 'hasConveyor'
  | 'hasGlow'
  | 'hasCrowd'
> => {
  switch (category) {
    case 'intake':
      return {
        roofVariant: 'peaked',
        accentVariant: 'corner',
        hasAntenna: false,
        hasTank: false,
        hasConveyor: false,
        hasGlow: false,
        hasCrowd: false,
      }
    case 'processing':
      return {
        roofVariant: 'sawtooth',
        accentVariant: 'stripe',
        hasAntenna: false,
        hasTank: true,
        hasConveyor: true,
        hasGlow: false,
        hasCrowd: false,
      }
    case 'storage':
      return {
        roofVariant: 'flat',
        accentVariant: 'band',
        hasAntenna: false,
        hasTank: true,
        hasConveyor: false,
        hasGlow: false,
        hasCrowd: false,
      }
    case 'distribution':
      return {
        roofVariant: 'dome',
        accentVariant: 'corner',
        hasAntenna: true,
        hasTank: false,
        hasConveyor: false,
        hasGlow: true,
        hasCrowd: false,
      }
    case 'research':
      return {
        roofVariant: 'dome',
        accentVariant: 'stripe',
        hasAntenna: true,
        hasTank: false,
        hasConveyor: false,
        hasGlow: true,
        hasCrowd: false,
      }
    case 'culture':
    default:
      return {
        roofVariant: 'peaked',
        accentVariant: 'band',
        hasAntenna: false,
        hasTank: false,
        hasConveyor: false,
        hasGlow: true,
        hasCrowd: true,
      }
  }
}

function animationAdjust(
  animationType: CompoundAnimationType,
  base: CompoundVisualHints
): void {
  switch (animationType) {
    case 'belt':
      base.hasConveyor = true
      base.motionIntensity = Math.max(base.motionIntensity, 0.45)
      break
    case 'signal':
      base.hasAntenna = true
      base.highlightType = 'pulse'
      base.motionIntensity = Math.max(base.motionIntensity, 0.5)
      break
    case 'vehicles':
      base.motionIntensity = Math.max(base.motionIntensity, 0.4)
      break
    case 'liquid':
      base.hasTank = true
      base.motionIntensity = Math.max(base.motionIntensity, 0.35)
      break
    case 'hologram':
      base.hasGlow = true
      base.highlightType = 'beacon'
      base.motionIntensity = Math.max(base.motionIntensity, 0.55)
      break
    case 'crowd':
      base.hasCrowd = true
      base.motionIntensity = Math.max(base.motionIntensity, 0.42)
      break
    case 'idle':
    default:
      break
  }
}

export function getCompoundVisualHints(
  category: CompoundCategory,
  animationType: CompoundAnimationType,
  districtTier: 1 | 2 | 3 | 4 | 5,
  isCurrentDistrict: boolean,
  isLandmark: boolean
): CompoundVisualHints {
  const cb = categoryBase(category)
  const motionIntensity = 0.12 + districtTier * 0.07 + (isLandmark ? 0.15 : 0)
  const landmarkPresence = isLandmark ? 0.85 : 0.15 + districtTier * 0.05

  const hints: CompoundVisualHints = {
    ...cb,
    motionIntensity,
    highlightType: 'none',
    landmarkPresence,
  }

  animationAdjust(animationType, hints)

  if (isCurrentDistrict) {
    hints.motionIntensity = Math.min(1, hints.motionIntensity * 1.45)
    hints.hasGlow = true
    if (hints.highlightType === 'none') hints.highlightType = 'rim'
  }

  return hints
}
