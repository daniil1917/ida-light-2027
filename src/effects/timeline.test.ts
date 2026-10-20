import { describe, expect, it } from 'vitest'
import { CelebrationClock, celebrationPhase, windowHasTurnedOn } from './timeline'
describe('celebration timeline', () => {
  it('reveals architecture before the card and lights windows from the bottom', () => {
    expect(celebrationPhase(1.2, false)).toBe('roof')
    expect(windowHasTurnedOn(1.5, 1, false)).toBe(true)
    expect(windowHasTurnedOn(1.5, 20, false)).toBe(false)
    expect(windowHasTurnedOn(2.1, 20, false)).toBe(true)
    expect(celebrationPhase(2.8, false)).toBe('confetti')
    expect(celebrationPhase(3.3, false)).toBe('confetti')
    expect(celebrationPhase(4.9, false)).toBe('ready')
  })
  it('pauses elapsed animation time and never jumps across background time', () => {
    const clock = new CelebrationClock(); clock.begin(1, false)
    clock.advance(.02, false); clock.advance(20, true)
    expect(clock.elapsed).toBe(.02)
    clock.advance(20, false)
    expect(clock.elapsed).toBeCloseTo(.07)
  })
  it('preserves a session on re-render, resets on replay, and clears at exit', () => {
    const clock = new CelebrationClock(); clock.begin(1, false); clock.advance(.04, false)
    clock.begin(1, false); expect(clock.elapsed).toBe(.04)
    clock.begin(2, false); expect(clock.elapsed).toBe(0)
    clock.reset(); clock.advance(1, false); expect(clock.elapsed).toBe(0)
  })
  it('shows the static completed scene without waiting or particle stages in reduced motion', () => {
    expect(windowHasTurnedOn(0, 20, true)).toBe(true)
    expect(celebrationPhase(.2, true)).toBe('build')
    expect(celebrationPhase(.5, true)).toBe('ready')
  })
})
