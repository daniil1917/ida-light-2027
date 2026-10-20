import { GAME_CONFIG } from './gameConfig'

export const DIFFICULTY_STAGES = [
  { from: 1, to: 3, speed: [1.175, 1.258], amplitude: [1.75, 1.8] },
  { from: 4, to: 6, speed: [1.29, 1.404], amplitude: [1.8, 1.9] },
  { from: 7, to: 10, speed: [1.435, 1.55], amplitude: [1.9, 2] },
  { from: 11, to: 13, speed: [1.57, 1.664], amplitude: [2, 2.1] },
  { from: 14, to: 14, speed: [1.737, 1.737], amplitude: [2.15, 2.15] },
  // The last floor keeps the rhythm of the final stage.
  { from: GAME_CONFIG.targetFloors, to: GAME_CONFIG.targetFloors, speed: [1.737, 1.737], amplitude: [2.15, 2.15] },
] as const

export function getDifficulty(floor: number) {
  const clamped = Number.isFinite(floor) ? Math.min(GAME_CONFIG.targetFloors, Math.max(1, Math.floor(floor))) : 1
  const level = DIFFICULTY_STAGES.findIndex(stage => clamped <= stage.to)
  const stage = DIFFICULTY_STAGES[level]
  const t = stage.to === stage.from ? 0 : (clamped - stage.from) / (stage.to - stage.from)
  return { level: level + 1, speed: stage.speed[0] + t * (stage.speed[1] - stage.speed[0]),
    amplitude: (stage.amplitude[0] + t * (stage.amplitude[1] - stage.amplitude[0])) * (GAME_CONFIG.floorWidth / 3) }
}
