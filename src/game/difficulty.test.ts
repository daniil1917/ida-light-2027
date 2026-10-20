import { GAME_CONFIG } from './gameConfig'
import { getFloorType } from '../assets/assetPaths'
import { describe, expect, it } from 'vitest'
import { getDifficulty } from './difficulty'
import { getVisualProgression, isWindowLit } from './progression'

describe('campaign balance', () => {
  it('keeps every floor renderable and marks floors 7, 14 and 15 as special', () => {
    for (let floor = 1; floor <= GAME_CONFIG.targetFloors; floor++) {
      expect(getFloorType(floor)).toEqual([7, 14, GAME_CONFIG.targetFloors].includes(floor) ? 'special' : expect.stringMatching(/^[abc]$/))
    }
  })
  it('ramps speed and amplitude monotonically through the penultimate floor', () => {
    for (let floor = 2; floor < GAME_CONFIG.targetFloors; floor++) {
      expect(getDifficulty(floor).speed).toBeGreaterThanOrEqual(getDifficulty(floor - 1).speed)
      expect(getDifficulty(floor).amplitude).toBeGreaterThanOrEqual(getDifficulty(floor - 1).amplitude)
    }
  })
  it('keeps the final challenge and clamps invalid floor indices', () => {
    expect(getDifficulty(GAME_CONFIG.targetFloors).speed).toBe(getDifficulty(GAME_CONFIG.targetFloors - 1).speed)
    expect(getDifficulty(GAME_CONFIG.targetFloors).amplitude).toBe(getDifficulty(GAME_CONFIG.targetFloors - 1).amplitude)
    expect(getDifficulty(0)).toEqual(getDifficulty(1))
    expect(getDifficulty(100)).toEqual(getDifficulty(GAME_CONFIG.targetFloors))
    expect(getDifficulty(NaN)).toEqual(getDifficulty(1))
  })
  it('keeps a human timing window while increasing the challenge', () => {
    const maxOffset = GAME_CONFIG.floorWidth * (1 - GAME_CONFIG.successOverlap)
    const windowMs = (floor: number) => {
      const difficulty = getDifficulty(floor)
      return 2000 * Math.asin(maxOffset / difficulty.amplitude) / difficulty.speed
    }
    expect(windowMs(1)).toBeGreaterThan(1200)
    expect(windowMs(GAME_CONFIG.targetFloors)).toBeGreaterThan(630)
    expect(windowMs(GAME_CONFIG.targetFloors)).toBeLessThan(660)
    for (let floor = 2; floor <= GAME_CONFIG.targetFloors; floor++) {
      expect(windowMs(floor)).toBeLessThanOrEqual(windowMs(floor - 1))
      expect(getDifficulty(floor).amplitude).toBeLessThanOrEqual(GAME_CONFIG.maxSwingAmplitude)
    }
  })
  it('illuminates windows consistently as the tower grows', () => {
    for (let floor = 1; floor <= GAME_CONFIG.targetFloors; floor++) for (let window = 0; window < 8; window++) {
      let previous = false
      for (const count of [0, 4, 7, 11, 14, GAME_CONFIG.targetFloors]) {
        const current = isWindowLit(floor, window, getVisualProgression(count).windowRatio)
        if (previous) expect(current).toBe(true)
        previous = current
      }
      expect(previous).toBe(true)
    }
  })
})
