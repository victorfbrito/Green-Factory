/**
 * Parcel shapes for territory growth.
 * Parcel – Shape used only during territory growth (2×1, 2×2, …).
 * Not a visible layer; only affects district territory shape.
 */

/** [dx, dy] relative to top-left. Used for block-like territory growth. */
export const PARCEL_SHAPES: [number, number][][] = [
  [[0, 0], [1, 0]],           // 2x1
  [[0, 0], [0, 1]],           // 1x2
  [[0, 0], [1, 0], [0, 1], [1, 1]], // 2x2
  [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]], // 3x2
  [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]], // 2x3
  [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]], // 3x3
]
