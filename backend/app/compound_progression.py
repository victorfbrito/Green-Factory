"""
Compound progression from language XP.
XP-based V1: compounds unlock from total XP in that language.
Increasing-cost progression: early growth fast, later growth slows.
"""

from dataclasses import dataclass


# V1 threshold table: total XP -> compound count
# 0 XP -> 1 compound, 25 -> 2, 50 -> 3, 100 -> 4, 175 -> 5, 275 -> 6, 400 -> 7, 550 -> 8, 725 -> 9, 925 -> 10
_COMPOUND_THRESHOLDS: tuple[int, ...] = (0, 25, 50, 100, 175, 275, 400, 550, 725, 925)


@dataclass(frozen=True)
class CompoundProgress:
    compound_count: int
    next_compound_at_xp: int
    xp_to_next_compound: int
    compound_progress_ratio: float


def _cost_for_compound_n(n: int) -> int:
    """XP cost to unlock compound n (n >= 2). Cost from (n-1) to n compounds."""
    if n == 2:
        return 25
    if n == 3:
        return 25
    if n <= 10:
        return 25 * (n - 2)
    # Beyond 10: compound11 = compound10_cost + 200, compound12 = +400, compound13 = +600, ...
    base = 25 * (10 - 2)  # 200, same as compound10
    return base + (n - 11) * 200


def _threshold_for_compound_n(n: int) -> int:
    """Total XP threshold at which compound n is unlocked."""
    if n <= 1:
        return 0
    if n <= 10:
        return _COMPOUND_THRESHOLDS[n - 1]
    # Beyond 10: each next compound costs 200 XP (flat)
    # threshold(11) = 925 + 200, threshold(12) = 1125 + 200, ...
    prev = _COMPOUND_THRESHOLDS[9]  # 925
    for i in range(11, n + 1):
        cost = _cost_for_compound_n(i)
        prev = prev + cost
    return prev


def get_compound_progress(xp: int) -> CompoundProgress:
    """
    Compute compound progression for a language with given total XP.
    If the user has the course, the language always starts with 1 compound at 0 XP.
    """
    xp = max(0, xp)

    # Find current compound count by walking thresholds
    compound_count = 1
    next_compound_at_xp = 25

    if xp >= 925:
        # Beyond hard-coded table: compute dynamically
        compound_count = 10
        next_compound_at_xp = _threshold_for_compound_n(11)
        while xp >= next_compound_at_xp:
            compound_count += 1
            next_compound_at_xp = _threshold_for_compound_n(compound_count + 1)
    else:
        for i in range(1, len(_COMPOUND_THRESHOLDS)):
            thresh = _COMPOUND_THRESHOLDS[i]
            if xp >= thresh:
                compound_count = i + 1
                next_compound_at_xp = (
                    _COMPOUND_THRESHOLDS[i + 1] if i + 1 < len(_COMPOUND_THRESHOLDS)
                    else _threshold_for_compound_n(11)
                )
            else:
                next_compound_at_xp = thresh
                break

    xp_to_next = max(0, next_compound_at_xp - xp)

    # Progress ratio: 0..1 from current threshold to next
    current_threshold: int
    if compound_count == 1:
        current_threshold = 0
    elif compound_count <= 10:
        current_threshold = _COMPOUND_THRESHOLDS[compound_count - 1]
    else:
        current_threshold = _threshold_for_compound_n(compound_count)
    span = next_compound_at_xp - current_threshold
    if span <= 0:
        compound_progress_ratio = 1.0
    else:
        compound_progress_ratio = (xp - current_threshold) / span
        compound_progress_ratio = max(0.0, min(1.0, compound_progress_ratio))

    return CompoundProgress(
        compound_count=compound_count,
        next_compound_at_xp=next_compound_at_xp,
        xp_to_next_compound=xp_to_next,
        compound_progress_ratio=round(compound_progress_ratio, 4),
    )
