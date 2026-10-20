import { expect, test } from 'vitest'
import { craneSections, craneReach, CRANE_MAX_SECTIONS, CRANE_BOOM_HEIGHT } from './craneLayout'
import { GAME_CONFIG } from '../game/gameConfig'

test('crane stays grounded and has a continuous mast through all campaign floors and replay', () => {
  for (const floor of [...Array.from({ length: GAME_CONFIG.targetFloors + 1 }, (_, i) => i), 0]) {
    const sections = craneSections(floor)
    expect(sections[0].y).toBe(0)
    expect(sections.length).toBeLessThanOrEqual(CRANE_MAX_SECTIONS)
    for (let i = 1; i < sections.length; i++) expect(sections[i].y).toBeCloseTo(sections[i - 1].y + sections[i - 1].height)
    const top = sections.at(-1)!
    expect(top.y + top.height).toBeCloseTo(CRANE_BOOM_HEIGHT + floor * GAME_CONFIG.floorHeight)
  }
})

test('the telescope covers alternating feed and every drifting support without moving the mast', () => {
  for (const direction of [-1, 1]) {
    const placed: number[] = []
    for (let floor = 0; floor <= GAME_CONFIG.targetFloors; floor++) {
      if (floor) placed.push(direction * floor * 1.65)
      const reach = craneReach(placed)
      const support = placed.at(-1) ?? 0
      expect(reach.min).toBeLessThanOrEqual(support - GAME_CONFIG.maxSwingAmplitude - .33 / 2 - .2)
      expect(reach.max).toBeGreaterThanOrEqual(support + GAME_CONFIG.maxSwingAmplitude + .33 / 2 + .2)
      expect(reach.min).toBeLessThan(GAME_CONFIG.craneMastX)
      expect(reach.max).toBeGreaterThan(GAME_CONFIG.craneMastX)
    }
  }
})
