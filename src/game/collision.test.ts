import { describe, expect, it } from 'vitest'
import { GAME_CONFIG as G } from './gameConfig'
import { classifyLanding, intersectionRatio } from './collision'

describe('horizontal overlap', () => {
  it('is full at the center and zero outside either edge', () => {
    expect(intersectionRatio(0, 0)).toBe(1)
    expect(intersectionRatio(4, 0)).toBe(0)
    expect(intersectionRatio(-4, 0)).toBe(0)
  })
  it('includes the exact 94% perfect boundary on both sides', () => {
    const limit = G.floorWidth * (1 - G.perfectOverlap)
    expect(classifyLanding(limit, 0)).toBe('perfect')
    expect(classifyLanding(-limit, 0)).toBe('perfect')
    expect(classifyLanding(limit + .00001, 0)).toBe('success')
  })
  it('includes the exact 62% success boundary on both sides', () => {
    const limit = G.floorWidth * (1 - G.successOverlap)
    expect(classifyLanding(limit, 0)).toBe('success')
    expect(classifyLanding(-limit, 0)).toBe('success')
    expect(classifyLanding(limit + .00001, 0)).toBe('fail')
  })
  it('measures relative to the previous floor, not the original base', () => {
    expect(classifyLanding(6.15, 6)).toBe('perfect')
    expect(classifyLanding(7, 6)).toBe('success')
    expect(classifyLanding(8, 6)).toBe('fail')
  })
  it('rejects invalid inputs safely', () => {
    expect(classifyLanding(NaN, 0)).toBe('fail')
    expect(classifyLanding(Infinity, 0)).toBe('fail')
    expect(intersectionRatio(0, 0, 0)).toBe(0)
  })
  it('is symmetric, bounded and decreases with distance', () => {
    let previous = 1
    for (let i = 0; i < 1000; i++) {
      const distance = i / 100
      const overlap = intersectionRatio(distance, 0)
      expect(overlap).toBeGreaterThanOrEqual(0)
      expect(overlap).toBeLessThanOrEqual(previous)
      expect(overlap).toBe(intersectionRatio(-distance, 0))
      previous = overlap
    }
  })
})
