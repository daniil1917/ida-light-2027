import type { PerformanceMode } from '../game/types'

export const QUALITY_GOVERNOR = { windowSeconds: 3, minimumFPS: 45, slowWindows: 2,
  recoveryFPS: 58, recoveryWindows: 10, retrySeconds: 120, resumeGap: .25 } as const

/** Downgrade after sustained slow rendering; a single stall or hidden tab never counts. */
export class QualityGovernor {
  private elapsed = 0
  private frames = 0
  private slow = 0
  private fast = 0
  private cooldown = 0
  private probe = 0
  reset() { this.elapsed = 0; this.frames = 0; this.slow = 0; this.fast = 0 }
  observe(delta: number, eligible: boolean, mode: PerformanceMode): PerformanceMode {
    if (!eligible || !Number.isFinite(delta) || delta <= 0 || delta > QUALITY_GOVERNOR.resumeGap) { this.reset(); return mode }
    this.cooldown = Math.max(0, this.cooldown - delta)
    this.probe = Math.max(0, this.probe - delta)
    this.elapsed += delta; this.frames++
    if (this.elapsed < QUALITY_GOVERNOR.windowSeconds) return mode
    const fps = this.frames / this.elapsed
    this.slow = fps < QUALITY_GOVERNOR.minimumFPS ? this.slow + 1 : 0
    this.fast = fps >= QUALITY_GOVERNOR.recoveryFPS && !this.cooldown ? this.fast + 1 : 0
    this.elapsed = 0; this.frames = 0
    if (mode !== 'low' && this.slow >= QUALITY_GOVERNOR.slowWindows) {
      if (this.probe > 0) this.cooldown = QUALITY_GOVERNOR.retrySeconds
      this.reset()
      return mode === 'high' ? 'medium' : 'low'
    }
    if (mode !== 'high' && this.fast >= QUALITY_GOVERNOR.recoveryWindows) {
      this.reset(); this.probe = 12
      return mode === 'low' ? 'medium' : 'high'
    }
    return mode
  }
}
