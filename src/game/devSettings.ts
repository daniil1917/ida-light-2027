import { create } from 'zustand'
import { GAME_CONFIG } from './gameConfig'

export const useDevSettings = create(() => ({
  overrideDifficulty: false,
  swingSpeed: Number(GAME_CONFIG.swingSpeed),
  amplitude: Number(GAME_CONFIG.swingAmplitude),
  gravity: Number(GAME_CONFIG.gravity),
  perfectTolerance: Number(GAME_CONFIG.perfectOverlap),
  successTolerance: Number(GAME_CONFIG.successOverlap),
  cameraZoom: 1,
  physicsDebug: false,
  staticFinal: false,
}))
