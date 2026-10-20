import { describe, expect, it } from 'vitest'
import { renderDpr } from './performanceConfig'

describe('render resolution', () => {
  it('supersamples an explicit high preset even on a standard screen', () => {
    expect(renderDpr('high', true, 1, 600, 844)).toBe(3)
    expect(renderDpr('high', true, 2, 600, 844)).toBe(3)
  })
  it('caps framebuffer allocation while preserving mobile and automatic presets', () => {
    expect(renderDpr('high', true, 3, 2000, 2000) ** 2 * 2000 * 2000).toBeLessThanOrEqual(5_000_001)
    expect(renderDpr('medium', false, 3, 390, 844)).toBe(1.5)
    expect(renderDpr('low', true, 3, 390, 844)).toBe(1)
    expect(renderDpr('high', false, 2, 600, 844)).toBe(2)
  })
})
