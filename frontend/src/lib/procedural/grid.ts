/**
 * Shared world grid constants and utilities.
 * Grid-first design: 60×60 cells, 14px per cell.
 */

export const MAP_SIZE = 840
export const CELL_SIZE = 14
export const GRID_SIZE = Math.floor(MAP_SIZE / CELL_SIZE) // 60

export function worldToCell(worldX: number, worldY: number): [number, number] {
  const cx = Math.floor(worldX / CELL_SIZE)
  const cy = Math.floor(worldY / CELL_SIZE)
  return [
    Math.max(0, Math.min(GRID_SIZE - 1, cx)),
    Math.max(0, Math.min(GRID_SIZE - 1, cy)),
  ]
}

export function cellToWorld(cx: number, cy: number): [number, number] {
  return [cx * CELL_SIZE + CELL_SIZE / 2, cy * CELL_SIZE + CELL_SIZE / 2]
}

export function cellKey(cx: number, cy: number): string {
  return `${cx},${cy}`
}
