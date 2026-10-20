import { expect, test } from 'vitest'
import { GAME_CONFIG as G } from '../../game/gameConfig'
import { towerBuffers } from './towerBuffers'
const floors = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, x: .12 + i * .9,
  y: G.baseHeight + (i + .5) * G.floorHeight, perfect: false }))
test('all twenty placed modules retain their exact coordinates and height', () => {
  towerBuffers(floors).forEach((buffer, i) => {
    expect(buffer.matrix.elements.slice(12, 15)).toEqual([floors[i].x, floors[i].y, 0])
    if (i) expect(floors[i].y - floors[i - 1].y).toBeCloseTo(G.floorHeight)
  })
})
test('snow cover follows actual offset of the next floor, leaving the top roof untouched', () => {
  const buffers = towerBuffers(floors)
  for (const buffer of buffers.slice(0, -1)) {
    expect(buffer.snowCover[0]).toBeCloseTo(.9)
    expect(buffer.snowCover[1]).toBe(1)
  }
  expect(buffers.at(-1)!.snowCover).toEqual([0, 0])
})
test('separating a tower retains decorations and clears snow on the exposed lower roof', () => {
  const lower = towerBuffers(floors.slice(0, 6))
  const upper = towerBuffers(floors.slice(6, 8), 7)
  expect(lower.at(-1)!.snowCover[1]).toBe(0)
  expect(upper.map(buffer => buffer.wreath)).toEqual([false, true])
  expect(upper[0].matrix.elements[12]).toBe(floors[6].x)
})
