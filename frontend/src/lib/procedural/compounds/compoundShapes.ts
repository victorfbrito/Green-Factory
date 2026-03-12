/**
 * Compound shape definitions. Rectangular only.
 * Compound – One placed cluster of cells: a rectangle only (2×1, 2×2, 3×1, 3×2, 3×3).
 */

export type CompoundShapeId =
  | 'rect_2x1'
  | 'rect_2x2'
  | 'rect_3x1'
  | 'rect_3x2'
  | 'rect_3x3'
  | 'landmark_pad'

/** [dc, dr] relative to origin (0,0). */
export const COMPOUND_SHAPES: Record<CompoundShapeId, [number, number][]> = {
  rect_2x1: [[0, 0], [1, 0]],
  rect_2x2: [[0, 0], [1, 0], [0, 1], [1, 1]],
  rect_3x1: [[0, 0], [1, 0], [2, 0]],
  rect_3x2: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
  rect_3x3: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
  landmark_pad: [[0, 0], [1, 0], [0, 1], [1, 1]],
}

export const COMPOUND_SHAPE_IDS: CompoundShapeId[] = ['rect_2x1', 'rect_2x2', 'rect_3x1', 'rect_3x2', 'rect_3x3', 'landmark_pad']
