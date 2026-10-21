import type { PerformanceMode } from '../game/types'

export const PERFORMANCE_CONFIG = {
  high: { dpr: [1, 3] as [number, number], shadows: false, shadowSize: 2048 },
  medium: { dpr: [1, 1.5] as [number, number], shadows: false, shadowSize: 1024 },
  low: { dpr: [1, 1] as [number, number], shadows: false, shadowSize: 512 },
} as const

export function detectPerformanceMode(): PerformanceMode {
  return 'high'
}

/** Desktop assets and resolution on every device. Lighter rendering is opt-in. */
export function qualityPreset(search: string): 'high' | 'auto' | 'mobile' {
  const preset = new URLSearchParams(search).get('quality')
  return preset === 'auto' || preset === 'mobile' ? preset : 'high'
}
export const QUALITY_PRESET = qualityPreset(typeof location === 'undefined' ? '' : location.search)
export const MAX_QUALITY = QUALITY_PRESET === 'high'
export const WINTER_PROFILE = QUALITY_PRESET === 'mobile' ? 'mobile' : 'high'

export function renderDpr(mode: PerformanceMode, maximum: boolean, nativeDpr: number, width: number, height: number) {
  const [min, max] = PERFORMANCE_CONFIG[mode].dpr
  const desired = maximum && mode === 'high' ? 3 : Math.min(max, Math.max(min, nativeDpr))
  // Large desktop windows must not allocate an unbounded multisampled buffer.
  return Math.min(desired, Math.sqrt(5_000_000 / Math.max(1, width * height)))
}
