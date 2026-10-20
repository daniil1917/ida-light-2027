import { GAME_CONFIG as G } from './gameConfig'
import type { PlacedFloor } from './types'

export interface TowerCollapse {
  fromFloor: number
  pivotX: number
  pivotY: number
  direction: -1 | 1
}

/** Equal-mass storeys with a modest joint moment reserve and a weighted base. */
export function getTowerBalance(floors: readonly PlacedFloor[]) {
  let sumX = 0
  let collapse: TowerCollapse | null = null
  let instability = 0
  let direction: -1 | 0 | 1 = 0
  for (let index = floors.length - 1; index >= 0; index--) {
    const floor = floors[index]
    sumX += floor.x
    const centerX = sumX / (floors.length - index + (index === 0 ? G.foundationMass : 0))
    const supportX = floors[index - 1]?.x ?? 0
    const left = Math.max(floor.x, supportX) - G.floorWidth / 2
    const right = Math.min(floor.x, supportX) + G.floorWidth / 2
    const side = Math.sign(centerX - supportX) as -1 | 0 | 1
    const reach = (side > 0 ? right - supportX : supportX - left) + G.jointBalanceReserve
    const load = Math.abs(centerX - supportX) / reach
    if (load > instability) { instability = load; direction = side }
    if (load > 1 + 1e-6 && side) {
      // Choose the lowest failed joint; everything above it topples together.
      collapse = { fromFloor: index, pivotX: side > 0 ? right : left,
        pivotY: G.baseHeight + index * G.floorHeight, direction: side }
    }
  }
  // Reserve 100 for an actual collapse, even when rounding a near-limit load.
  return { percent: collapse ? 100 : Math.min(99, Math.round(instability * 100)), direction, collapse }
}

export function findTowerCollapse(floors: readonly PlacedFloor[]): TowerCollapse | null {
  return getTowerBalance(floors).collapse
}

export function collapseDurationMs(floors: readonly PlacedFloor[], collapse: TowerCollapse) {
  // Tall frames tilt more slowly, and a high failed joint has farther to fall.
  const extraHeight = Math.max(0, floors.length - collapse.fromFloor - 4) * G.floorHeight
  const extraDrop = Math.max(0, collapse.pivotY - G.baseHeight - G.floorHeight)
  return G.collapseDelayMs + Math.ceil(2000 * Math.sqrt(extraHeight / -G.gravity) + 1000 * Math.sqrt(2 * extraDrop / -G.gravity))
}
