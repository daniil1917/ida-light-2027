import { GAME_CONFIG } from './gameConfig'
import type { LandingResult } from './types'

export interface CollisionRules { perfectOverlap: number; successOverlap: number }
export function intersectionRatio(x: number, supportX: number, width: number = GAME_CONFIG.floorWidth): number {
  if (!Number.isFinite(x) || !Number.isFinite(supportX) || !Number.isFinite(width) || width <= 0) return 0
  return Math.max(0, 1 - Math.abs(x - supportX) / width)
}

export function classifyLanding(x: number, supportX: number, rules: CollisionRules = GAME_CONFIG): LandingResult {
  const overlap = intersectionRatio(x, supportX)
  // A tiny numeric tolerance avoids misclassifying a mathematically exact threshold.
  if (overlap + 1e-9 >= rules.perfectOverlap) return 'perfect'
  if (overlap + 1e-9 >= rules.successOverlap) return 'success'
  return 'fail'
}
