import { describe, expect, it } from 'vitest'
import { findTowerCollapse, getTowerBalance } from './stability'
import { GAME_CONFIG as G } from './gameConfig'

function tower(xs: number[]) {
  return xs.map((x, index) => ({ id: index + 1, x: x * G.floorWidth / 3, y: G.baseHeight + (index + .5) * G.floorHeight, perfect: false }))
}

describe('tower load balance', () => {
  it('supports a straight twenty-storey tower and balanced offsets', () => {
    expect(findTowerCollapse([])).toBeNull()
    expect(findTowerCollapse(tower(Array(20).fill(.12)))).toBeNull()
    expect(findTowerCollapse(tower(Array.from({ length: 20 }, (_, i) => i % 2 ? -.45 : .45)))).toBeNull()
  })
  it.each([-1, 1] as const)('topples the whole tower when accumulated load passes the base edge (%s)', direction => {
    expect(findTowerCollapse(tower([.9, 1.8, 2.7, 3.6].map(x => x * direction)))).toBeNull()
    expect(findTowerCollapse(tower([.9, 1.8, 2.7, 3.6, 4.5, 5.4, 6.3].map(x => x * direction)))).toEqual({
      fromFloor: 0, pivotX: direction * G.floorWidth / 2, pivotY: G.baseHeight, direction,
    })
  })
  it('checks each joint rather than only the average of the whole house', () => {
    expect(findTowerCollapse(tower([0, .9, 1.8, 2.7, 3.6, 4.5]))).toEqual({
      fromFloor: 1, pivotX: G.floorWidth / 2, pivotY: G.baseHeight + G.floorHeight, direction: 1,
    })
  })
  it('allows a counterweight instead of penalising the topmost coordinate alone', () => {
    expect(findTowerCollapse(tower([.9, 1.8, .7]))).toBeNull()
    const warning = getTowerBalance(tower([.9, 1.8, 2.7]))
    const recovered = getTowerBalance(tower([.9, 1.8, 2.7, 1.6]))
    expect(warning.percent).toBeGreaterThanOrEqual(55)
    expect(warning.direction).toBe(1)
    expect(recovered.percent).toBeLessThan(55)
    expect(recovered.collapse).toBeNull()
  })
  it('allows small accumulated errors through twenty floors in both directions', () => {
    for (const direction of [-1, 1]) {
      const floors = tower(Array.from({ length: 20 }, (_, i) => direction * .2 * (i + 1)))
      for (let count = 1; count <= 20; count++) expect(findTowerCollapse(floors.slice(0, count))).toBeNull()
    }
  })
  it('uses the same threshold for the counter and collapse, reserving 100 for falling', () => {
    expect(getTowerBalance([]).percent).toBe(0)
    const limit = G.floorWidth / 2 + G.jointBalanceReserve
    expect(getTowerBalance(tower([0, limit * 3 / G.floorWidth])).percent).toBe(99)
    const falling = getTowerBalance(tower([0, (limit + .001) * 3 / G.floorWidth]))
    expect(falling.percent).toBe(100)
    expect(falling.collapse?.fromFloor).toBe(1)
  })
})
