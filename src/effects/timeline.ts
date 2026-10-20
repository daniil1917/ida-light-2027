import { CELEBRATION as C } from './celebrationConfig'
export type CelebrationPhase = 'idle' | 'build' | 'camera' | 'roof' | 'windows' | 'year' | 'bloom' | 'snow' | 'confetti' | 'ready'
export const ramp = (time: number, start: number, duration: number) => Math.max(0, Math.min(1, (time - start) / duration))
export const smooth = (progress: number) => progress * progress * (3 - 2 * progress)
const phases = ['camera', 'roof', 'windows', 'year', 'bloom', 'snow', 'confetti', 'ready'] as const

export function celebrationPhase(time: number, reduced: boolean): CelebrationPhase {
  if (reduced) return time >= C.reducedReady ? 'ready' : 'build'
  return [...phases].reverse().find(phase => time >= C[phase]) ?? 'build'
}
export function windowHasTurnedOn(time: number, floor: number, reduced: boolean) {
  return reduced || time >= C.windows + (floor - 1) * C.windowStagger
}
export class CelebrationClock {
  sessionId: number | null = null
  elapsed = 0
  reduced = false
  begin(sessionId: number, reduced: boolean) {
    if (sessionId !== this.sessionId) this.elapsed = 0
    this.sessionId = sessionId; this.reduced = reduced
  }
  advance(delta: number, paused: boolean) {
    if (this.sessionId !== null && !paused) this.elapsed += Math.max(0, Math.min(delta, C.maxFrameDelta))
  }
  reset() { this.sessionId = null; this.elapsed = 0; this.reduced = false }
}
export const celebrationClock = new CelebrationClock()
