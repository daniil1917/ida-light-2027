import type { PerformanceMode } from '../game/types'

export const PERFORMANCE_CONFIG = {
  high: { dpr: [1, 2] as [number, number], shadows: false, shadowSize: 2048 },
  medium: { dpr: [1, 1.5] as [number, number], shadows: false, shadowSize: 1024 },
  low: { dpr: [1, 1] as [number, number], shadows: false, shadowSize: 512 },
} as const

export function detectPerformanceMode(): PerformanceMode {
  // Actual frame times choose the tier; CPU core count says little about GPU speed.
  return 'high'
}

// An explicit high preset is for reviewing the original assets, without the
// frame-time governor silently lowering their screen resolution.
export const MAX_QUALITY = new URLSearchParams(typeof location === 'undefined' ? '' : location.search).get('quality') === 'high'

export function renderDpr(mode: PerformanceMode, maximum: boolean, nativeDpr: number, width: number, height: number) {
  const [min, max] = PERFORMANCE_CONFIG[mode].dpr
  const desired = maximum && mode === 'high' ? 3 : Math.min(max, Math.max(min, nativeDpr))
  // Large desktop windows must not allocate an unbounded multisampled buffer.
  return Math.min(desired, Math.sqrt(5_000_000 / Math.max(1, width * height)))
}
