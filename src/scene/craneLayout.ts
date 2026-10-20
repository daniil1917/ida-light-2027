import { GAME_CONFIG } from '../game/gameConfig'

export const CRANE_BOOM_HEIGHT = GAME_CONFIG.baseHeight + GAME_CONFIG.floorHeight / 2 + GAME_CONFIG.dropHeight + .9 + 1.315
export const CRANE_MAX_SECTIONS = Math.ceil((CRANE_BOOM_HEIGHT + GAME_CONFIG.targetFloors * GAME_CONFIG.floorHeight) / .68)

/** The telescope covers the whole run; its grounded mast never follows the tower. */
export function craneReach(positions: number[]) {
  const padding = GAME_CONFIG.maxSwingAmplitude + .33 / 2 + GAME_CONFIG.craneEndMargin
  return { min: Math.min(GAME_CONFIG.craneMastX - .65, ...positions.map(x => x - padding), -padding),
    max: Math.max(GAME_CONFIG.craneMastX + .65, ...positions.map(x => x + padding), padding) }
}

/** Section positions are rooted at y=0; only the last section changes height. */
export function craneSections(floors: number) {
  const height = CRANE_BOOM_HEIGHT + Math.min(GAME_CONFIG.targetFloors, Math.max(0, floors)) * GAME_CONFIG.floorHeight
  return Array.from({ length: Math.ceil(height / .68) }, (_, i) => ({ y: i * .68, height: Math.min(.68, height - i * .68) }))
}
