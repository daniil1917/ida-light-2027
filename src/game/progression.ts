import brand from '../app/brand.json'
import { GAME_CONFIG } from './gameConfig'

export const PROGRESSION_STAGES = [
  { to: 3, background: brand.colors.black, windowRatio: 0.55, ambientIntensity: 2.2, keyIntensity: 3.6 },
  { to: 6, background: brand.colors.black, windowRatio: 0.65, ambientIntensity: 2, keyIntensity: 3.4 },
  { to: 10, background: brand.colors.black, windowRatio: 0.75, ambientIntensity: 1.8, keyIntensity: 3.2 },
  { to: 13, background: brand.colors.black, windowRatio: 0.85, ambientIntensity: 1.6, keyIntensity: 3 },
  { to: 14, background: brand.colors.black, windowRatio: 0.93, ambientIntensity: 1.5, keyIntensity: 2.9 },
  { to: GAME_CONFIG.targetFloors, background: brand.colors.black, windowRatio: 1, ambientIntensity: 1.5, keyIntensity: 2.9 },
] as const

export function getVisualProgression(floors: number) {
  return PROGRESSION_STAGES.find(stage => floors <= stage.to) ?? PROGRESSION_STAGES.at(-1)!
}

export function isWindowLit(floor: number, window: number, ratio: number): boolean {
  const hash = Math.imul(floor + 17, 73856093) ^ Math.imul(window + 3, 19349663)
  return ((hash >>> 0) % 1000) / 1000 < ratio
}
