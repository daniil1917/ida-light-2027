import { describe, expect, it } from 'vitest'
import { qualityPreset, renderDpr, MAX_QUALITY, WINTER_PROFILE } from './performanceConfig'

describe('render resolution', () => {
  it('ships desktop quality by default, without a touch-screen downgrade', () => {
    expect(qualityPreset('')).toBe('high')
    expect(qualityPreset('?v=0.24.0')).toBe('high')
    expect(qualityPreset('?quality=unknown')).toBe('high')
    expect(MAX_QUALITY).toBe(true)
    expect(WINTER_PROFILE).toBe('high')
    expect(qualityPreset('?quality=auto')).toBe('auto')
    expect(qualityPreset('?quality=mobile')).toBe('mobile')
  })
  it.each([[320, 568], [390, 844], [430, 932]])('renders mobile %s×%s as sharply as the desktop high preset', (width, height) => {
    expect(renderDpr('high', true, 3, width, height)).toBe(3)
    expect(renderDpr('high', false, 3, width, height)).toBe(3)
  })
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
