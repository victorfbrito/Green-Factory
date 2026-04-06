const COMPOUND_THRESHOLDS = [0, 25, 50, 100, 175, 275, 400, 550, 725, 925] as const

export interface CompoundProgress {
  compound_count: number
  next_compound_at_xp: number
  xp_to_next_compound: number
  compound_progress_ratio: number
}

function costForCompoundN(n: number): number {
  if (n === 2 || n === 3) return 25
  if (n <= 10) return 25 * (n - 2)
  return 25 * 8 + (n - 11) * 200
}

function thresholdForCompoundN(n: number): number {
  if (n <= 1) return 0
  if (n <= 10) return COMPOUND_THRESHOLDS[n - 1]

  let threshold = COMPOUND_THRESHOLDS[9]
  for (let i = 11; i <= n; i++) {
    threshold += costForCompoundN(i)
  }
  return threshold
}

export function getCompoundProgress(xp: number): CompoundProgress {
  const safeXp = Math.max(0, xp)
  let compoundCount = 1
  let nextCompoundAtXp = 25

  if (safeXp >= 925) {
    compoundCount = 10
    nextCompoundAtXp = thresholdForCompoundN(11)
    while (safeXp >= nextCompoundAtXp) {
      compoundCount += 1
      nextCompoundAtXp = thresholdForCompoundN(compoundCount + 1)
    }
  } else {
    for (let i = 1; i < COMPOUND_THRESHOLDS.length; i++) {
      const threshold = COMPOUND_THRESHOLDS[i]
      if (safeXp >= threshold) {
        compoundCount = i + 1
        nextCompoundAtXp =
          i + 1 < COMPOUND_THRESHOLDS.length ? COMPOUND_THRESHOLDS[i + 1] : thresholdForCompoundN(11)
      } else {
        nextCompoundAtXp = threshold
        break
      }
    }
  }

  const currentThreshold =
    compoundCount === 1
      ? 0
      : compoundCount <= 10
        ? COMPOUND_THRESHOLDS[compoundCount - 1]
        : thresholdForCompoundN(compoundCount)
  const span = nextCompoundAtXp - currentThreshold
  const progressRatio =
    span <= 0 ? 1 : Math.max(0, Math.min(1, (safeXp - currentThreshold) / span))

  return {
    compound_count: compoundCount,
    next_compound_at_xp: nextCompoundAtXp,
    xp_to_next_compound: Math.max(0, nextCompoundAtXp - safeXp),
    compound_progress_ratio: Number(progressRatio.toFixed(4)),
  }
}
