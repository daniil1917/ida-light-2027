import { describe, expect, it } from 'vitest'
import { QualityGovernor } from './qualityGovernor'
import type { PerformanceMode } from '../game/types'
function run(governor: QualityGovernor, mode: PerformanceMode, fps: number, frames: number) {
  for (let i = 0; i < frames; i++) mode = governor.observe(1 / fps, true, mode)
  return mode
}
describe('adaptive rendering quality', () => {
  it('reduces quality for sustained 35 fps, rather than accepting visible stutter', () => {
    expect(run(new QualityGovernor(), 'high', 35, 215)).toBe('medium')
  })
  it('keeps smooth rendering and downgrades sustained slow windows one step at a time', () => {
    const governor = new QualityGovernor()
    expect(run(governor, 'high', 60, 400)).toBe('high')
    governor.reset()
    const medium = run(governor, 'high', 20, 125)
    expect(medium).toBe('medium')
    expect(run(governor, medium, 20, 125)).toBe('low')
  })
  it('does not count a single slow window, background pause or resume gap as sustained slowness', () => {
    const governor = new QualityGovernor()
    expect(run(governor, 'high', 20, 61)).toBe('high')
    expect(governor.observe(2, true, 'high')).toBe('high')
    expect(run(governor, 'high', 20, 61)).toBe('high')
    governor.observe(.05, false, 'high')
    expect(run(governor, 'high', 20, 61)).toBe('high')
    expect(run(governor, 'high', 60, 400)).toBe('high')
  })
  it('restores one tier after sustained smooth rendering, and backs off a failed upgrade', () => {
    const governor = new QualityGovernor()
    expect(run(governor, 'low', 60, 1700)).toBe('low')
    const recovered = run(governor, 'low', 60, 200)
    expect(recovered).toBe('medium')
    const fallback = run(governor, recovered, 35, 320)
    expect(fallback).toBe('low')
    expect(run(governor, fallback, 60, 3600)).toBe('low')
  })
})
