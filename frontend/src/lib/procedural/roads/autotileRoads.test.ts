import { describe, expect, it } from 'vitest'
import {
  applyGroundSvgArtRotation,
  autotileRoadNetwork,
  coordsToCellKey,
  getDeterministicVariant,
  getRoadMask,
  maskToTile,
  parseCellKey,
} from './autotileRoads'

function key(x: number, y: number) {
  return coordsToCellKey(x, y)
}

describe('parseCellKey / coordsToCellKey', () => {
  it('round-trips', () => {
    expect(parseCellKey('12,34')).toEqual({ x: 12, y: 34 })
    expect(coordsToCellKey(12, 34)).toBe('12,34')
  })
})

describe('applyGroundSvgArtRotation', () => {
  it('matches maskToTile then applies SVG tweaks (single source for road + lane)', () => {
    const m = maskToTile(7)
    expect(m.tileType).toBe('t')
    expect(applyGroundSvgArtRotation(m.tileType, 7, m.rotation)).toBe(270)

    const m11 = maskToTile(11)
    expect(applyGroundSvgArtRotation(m11.tileType, 11, m11.rotation)).toBe(0)

    const endE = maskToTile(2)
    expect(applyGroundSvgArtRotation(endE.tileType, 2, endE.rotation)).toBe(270)

    const corner = maskToTile(6)
    expect(applyGroundSvgArtRotation(corner.tileType, 6, corner.rotation)).toBe(270)

    expect(applyGroundSvgArtRotation('straight', 10, 90)).toBe(90)
    expect(applyGroundSvgArtRotation('cross', 15, 0)).toBe(0)
  })
})

describe('maskToTile', () => {
  it('isolated / mask 0 → end fallback', () => {
    expect(maskToTile(0)).toEqual({ tileType: 'end', rotation: 0 })
  })

  it('vertical straight N+S', () => {
    expect(maskToTile(5)).toEqual({ tileType: 'straight', rotation: 0 })
  })

  it('horizontal straight E+W', () => {
    expect(maskToTile(10)).toEqual({ tileType: 'straight', rotation: 90 })
  })

  it('each corner', () => {
    expect(maskToTile(3)).toEqual({ tileType: 'corner', rotation: 0 })
    expect(maskToTile(6)).toEqual({ tileType: 'corner', rotation: 90 })
    expect(maskToTile(12)).toEqual({ tileType: 'corner', rotation: 180 })
    expect(maskToTile(9)).toEqual({ tileType: 'corner', rotation: 270 })
  })

  it('each T: canonical rotation follows mask order 7→11→13→14 as 0°→90°→180°→270°', () => {
    expect(maskToTile(7)).toEqual({ tileType: 't', rotation: 0 })
    expect(maskToTile(11)).toEqual({ tileType: 't', rotation: 90 })
    expect(maskToTile(13)).toEqual({ tileType: 't', rotation: 180 })
    expect(maskToTile(14)).toEqual({ tileType: 't', rotation: 270 })
  })

  it('cross', () => {
    expect(maskToTile(15)).toEqual({ tileType: 'cross', rotation: 0 })
  })
})

describe('getRoadMask', () => {
  const occupied = new Set([key(5, 4), key(5, 5), key(5, 6)])
  it('middle of vertical strip has N+S', () => {
    expect(getRoadMask(5, 5, occupied)).toBe(5)
  })
})

describe('autotileRoadNetwork', () => {
  it('vertical strip: middle cell is straight N–S', () => {
    const { byKey } = autotileRoadNetwork({
      roadCells: new Set([key(5, 4), key(5, 5), key(5, 6)]),
      serviceLaneCells: new Set<string>(),
      seedKey: 'vstrip',
    })
    expect(byKey.get(key(5, 5))?.tileType).toBe('straight')
    expect(byKey.get(key(5, 5))?.rotation).toBe(0)
    expect(byKey.get(key(5, 5))?.mask).toBe(5)
  })

  it('horizontal strip: middle cell is straight E–W', () => {
    const { byKey } = autotileRoadNetwork({
      roadCells: new Set([key(4, 5), key(5, 5), key(6, 5)]),
      serviceLaneCells: new Set<string>(),
      seedKey: 'hstrip',
    })
    expect(byKey.get(key(5, 5))?.tileType).toBe('straight')
    expect(byKey.get(key(5, 5))?.rotation).toBe(90)
    expect(byKey.get(key(5, 5))?.mask).toBe(10)
  })

  it('isolated cell → end fallback', () => {
    const { descriptors } = autotileRoadNetwork({
      roadCells: new Set([key(10, 10)]),
      serviceLaneCells: new Set(),
      seedKey: 't1',
    })
    expect(descriptors).toHaveLength(1)
    expect(descriptors[0]).toMatchObject({
      mask: 0,
      tileType: 'end',
      rotation: 0,
      kind: 'road',
    })
  })

  it('road and service lane do not share connectivity (adjacent cells look isolated in-layer)', () => {
    const { descriptors } = autotileRoadNetwork({
      roadCells: new Set([key(1, 1)]),
      serviceLaneCells: new Set([key(1, 0)]),
      seedKey: 't2',
    })
    const road = descriptors.find((d) => d.key === key(1, 1))
    const lane = descriptors.find((d) => d.key === key(1, 0))
    expect(road?.mask).toBe(0)
    expect(lane?.mask).toBe(0)
  })

  it('descriptor.kind preserves original class', () => {
    const { descriptors } = autotileRoadNetwork({
      roadCells: new Set([key(2, 2)]),
      serviceLaneCells: new Set([key(2, 1)]),
      seedKey: 't3',
    })
    expect(descriptors.find((d) => d.key === key(2, 2))?.kind).toBe('road')
    expect(descriptors.find((d) => d.key === key(2, 1))?.kind).toBe('service_lane')
  })

  it('road wins kind if cell is in both sets', () => {
    const k = key(3, 3)
    const { descriptors } = autotileRoadNetwork({
      roadCells: new Set([k]),
      serviceLaneCells: new Set([k]),
      seedKey: 't4',
    })
    expect(descriptors[0]?.kind).toBe('road')
  })

  it('deterministic variant is stable', () => {
    const input = {
      roadCells: new Set([key(7, 7), key(7, 8)]),
      serviceLaneCells: new Set<string>(),
      variantCount: 3,
      seedKey: 'stable-seed',
    }
    const a = autotileRoadNetwork(input).descriptors
    const b = autotileRoadNetwork(input).descriptors
    expect(a).toEqual(b)
  })

  it('output ordering is stable (y then x)', () => {
    const { descriptors } = autotileRoadNetwork({
      roadCells: new Set([key(2, 1), key(0, 0), key(1, 0)]),
      serviceLaneCells: new Set(),
      seedKey: 'ord',
    })
    const ys = descriptors.map((d) => d.y)
    const xs = descriptors.map((d) => d.x)
    expect(ys).toEqual([0, 0, 1])
    expect(xs).toEqual([0, 1, 2])
  })

  it('byKey matches descriptors', () => {
    const { descriptors, byKey } = autotileRoadNetwork({
      roadCells: new Set([key(0, 0), key(1, 0)]),
      serviceLaneCells: new Set(),
    })
    expect(byKey.size).toBe(descriptors.length)
    for (const d of descriptors) {
      expect(byKey.get(d.key)).toBe(d)
    }
  })

  it('lane end caps on E/W (X): rotation +180° vs canonical so art faces the correct way', () => {
    const { byKey } = autotileRoadNetwork({
      roadCells: new Set(),
      serviceLaneCells: new Set([key(5, 5), key(6, 5)]),
      seedKey: 'lane-ew',
    })
    const left = byKey.get(key(5, 5))
    const right = byKey.get(key(6, 5))
    expect(left?.tileType).toBe('end')
    expect(left?.mask).toBe(2)
    expect(left?.rotation).toBe(270)
    expect(right?.tileType).toBe('end')
    expect(right?.mask).toBe(8)
    expect(right?.rotation).toBe(90)
  })

  it('road end caps on E/W: same +180° X-axis tweak as lanes', () => {
    const { byKey } = autotileRoadNetwork({
      roadCells: new Set([key(5, 5), key(6, 5)]),
      serviceLaneCells: new Set<string>(),
      seedKey: 'road-ew',
    })
    expect(byKey.get(key(5, 5))?.rotation).toBe(270)
    expect(byKey.get(key(6, 5))?.rotation).toBe(90)
  })

  it('L-corner masks E+S (6) and W+N (9): +180° for road and lane (X-oriented corners)', () => {
    const roadCells = new Set([
      key(10, 10),
      key(11, 10),
      key(10, 11),
    ])
    const { byKey: byRoad } = autotileRoadNetwork({
      roadCells,
      serviceLaneCells: new Set<string>(),
      seedKey: 'corner-es',
    })
    const c = byRoad.get(key(10, 10))
    expect(c?.tileType).toBe('corner')
    expect(c?.mask).toBe(6)
    expect(c?.rotation).toBe(270)

    const laneCells = new Set([
      key(20, 20),
      key(19, 20),
      key(20, 19),
    ])
    const { byKey: byLane } = autotileRoadNetwork({
      roadCells: new Set(),
      serviceLaneCells: laneCells,
      seedKey: 'corner-wn',
    })
    const w = byLane.get(key(20, 20))
    expect(w?.tileType).toBe('corner')
    expect(w?.mask).toBe(9)
    expect(w?.rotation).toBe(90)
  })

  it('T junction mask 7 (N+E+S): +180° vs canonical', () => {
    const roadCells = new Set([key(5, 5), key(5, 4), key(6, 5), key(5, 6)])
    const { byKey } = autotileRoadNetwork({
      roadCells,
      serviceLaneCells: new Set<string>(),
      seedKey: 't-7',
    })
    const c = byKey.get(key(5, 5))
    expect(c?.tileType).toBe('t')
    expect(c?.mask).toBe(7)
    expect(c?.rotation).toBe(270)
  })

  it('L-corner masks N+E (3) and S+W (12): keep canonical 0° / 180°', () => {
    const roadCells = new Set([
      key(10, 10),
      key(10, 9),
      key(11, 10),
    ])
    const { byKey } = autotileRoadNetwork({
      roadCells,
      serviceLaneCells: new Set<string>(),
      seedKey: 'corner-ne',
    })
    const c = byKey.get(key(10, 10))
    expect(c?.tileType).toBe('corner')
    expect(c?.mask).toBe(3)
    expect(c?.rotation).toBe(0)
  })
})

describe('getDeterministicVariant', () => {
  it('same inputs same variant', () => {
    expect(getDeterministicVariant(4, 9, 3, 'k')).toBe(getDeterministicVariant(4, 9, 3, 'k'))
  })
  it('variantCount 1 always 0', () => {
    expect(getDeterministicVariant(1, 2, 1, 'k')).toBe(0)
  })
})
