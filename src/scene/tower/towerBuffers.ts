import { Matrix4 } from 'three'
import type { PlacedFloor } from '../../game/types'

/** Store coordinates are already metres; never centre or snap them during rendering. */
export function towerBuffers(floors: PlacedFloor[], firstFloor = 1) {
  return floors.map((floor, i) => ({
    matrix: new Matrix4().makeTranslation(floor.x, floor.y, 0),
    wreath: firstFloor + i <= 1 || (firstFloor + i) % 4 === 0,
    snowCover: [floors[i + 1] ? floors[i + 1].x - floor.x : 0, floors[i + 1] ? 1 : 0] as const,
  }))
}
