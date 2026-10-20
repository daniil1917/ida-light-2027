import { GAME_CONFIG } from '../game/gameConfig'
import { publicAsset } from '../app/publicAsset'

export const ASSETS = {
  base: publicAsset('models/ida-base.glb'), city: publicAsset('models/ida-city.glb'), crane: publicAsset('models/ida-crane.glb'), roof: publicAsset('models/ida-roof.glb'),
  floors: ['models/ida-floor-a.glb', 'models/ida-floor-b.glb', 'models/ida-floor-c.glb', 'models/ida-floor-special.glb'].map(publicAsset),
  font: publicAsset('fonts/ida-euclid-digits.typeface.json'),
  holidayTrim: publicAsset('models/ida-holiday-trim.glb'),
  bakedQuarter: publicAsset('models/ida-quarter-baked.glb'),
} as const
export type FloorType = 'a' | 'b' | 'c' | 'special'
const PATTERN: FloorType[] = ['a', 'a', 'b', 'a', 'c', 'b']
export function getFloorType(floor: number): FloorType {
  return floor === GAME_CONFIG.targetFloors || floor % 7 === 0 ? 'special' : PATTERN[(floor - 1) % 7]
}
