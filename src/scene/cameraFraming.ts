import { GAME_CONFIG as G } from '../game/gameConfig'
import { isFinalState, type GameState, type PlacedFloor } from '../game/types'
import type { TowerCollapse } from '../game/stability'
import { VISUAL_CONFIG as V } from '../app/visualConfig'
import { craneReach, CRANE_BOOM_HEIGHT } from './craneLayout'
import { getDifficulty } from '../game/difficulty'
import { layoutGutter } from '../app/layout'

const [dx, dy, dz] = V.cameraDistance
const horizontal = Math.hypot(dx, dz), distance = Math.hypot(dx, dy, dz)
const right = [dz / horizontal, 0, -dx / horizontal]
const up = [-dx * dy / (horizontal * distance), horizontal / distance, -dz * dy / (horizontal * distance)]

/** Fit projected geometry inside the free area, while the canvas stays full-screen. */
export function cameraFraming(state: GameState, floors: PlacedFloor[], collapse: TowerCollapse | null,
  width: number, height: number, greetingHeight = 320, zoomFactor = 1) {
  const count = floors.length, topY = G.baseHeight + count * G.floorHeight
  const complete = isFinalState(state), intro = state === 'intro' || state === 'loading'
  const reach = craneReach(floors.map(f => f.x))
  const boomY = CRANE_BOOM_HEIGHT + count * G.floorHeight
  const points: number[][] = []
  const box = (min: number[], max: number[]) => {
    for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) points.push([x, y, z])
  }
  if (intro || complete || collapse || count < 2) {
    // Native Site bounds, including the entry bridge and corner lanterns.
    box([-5.52, -.81, -3.72], [4.08, 2.222, 4.844])
  }
  const visibleFloors = complete || collapse ? floors : floors.slice(-3)
  for (const floor of visibleFloors) box([floor.x - G.floorWidth / 2, floor.y - G.floorHeight / 2, -G.floorDepth / 2],
    [floor.x + G.floorWidth / 2, floor.y + G.floorHeight / 2 + .25, G.floorDepth / 2])
  if (!complete && !collapse) {
    const supportX = floors.at(-1)?.x ?? 0, amplitude = getDifficulty(count + 1).amplitude
    box([supportX - amplitude - G.floorWidth / 2, topY + G.dropHeight, -G.floorDepth / 2],
      [supportX + amplitude + G.floorWidth / 2, topY + G.dropHeight + G.floorHeight + .25, G.floorDepth / 2])
    box([-G.floorWidth / 2, Math.max(0, topY - 3 * G.floorHeight), -G.floorDepth / 2], [G.floorWidth / 2, topY, G.floorDepth / 2])
  }
  box([reach.min - .15, boomY - .2, -.2], [reach.max + .15, boomY + .2, .2])
  box([G.craneMastX - .4, boomY - .5, G.craneMastZ - 2.05], [G.craneMastX + .4, boomY + .65, .4])
  if (complete) box([(floors.at(-1)?.x ?? 0) - 1.4, topY, -.1], [(floors.at(-1)?.x ?? 0) + 1.4, topY + 1.8, .1])
  if (collapse) {
    const end = collapse.pivotX + collapse.direction * (topY - collapse.pivotY)
    box([Math.min(collapse.pivotX, end) - G.floorWidth, -.5, -G.floorDepth],
      [Math.max(collapse.pivotX, end) + G.floorWidth, topY, G.floorDepth])
  }
  const xs = points.map(p => p[0] * right[0] + p[2] * right[2])
  const ys = points.map(p => p[0] * up[0] + p[1] * up[1] + p[2] * up[2])
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const margin = layoutGutter(width)
  const landscapeIntro = intro && width >= 480 && height <= 480
  const left = landscapeIntro ? width * .46 : margin, rightEdge = width - margin
  const top = landscapeIntro ? margin + 60 : intro ? (height <= 480 ? 170 : height <= 680 ? 200 : 220) + margin - 20 : margin + 60
  const bottom = state === 'greeting' ? height - greetingHeight - margin - 14 : height - margin - (intro ? 72 : 60)
  const zoom = Math.min((rightEdge - left) / (maxX - minX), Math.max(60, bottom - top) / (maxY - minY)) * zoomFactor
  const targetX = ((minX + maxX) / 2 + (width / 2 - (left + rightEdge) / 2) / zoom) / right[0]
  const targetY = ((minY + maxY) / 2 + ((top + bottom) / 2 - height / 2) / zoom - targetX * up[0]) / up[1]
  return { zoom, targetX, targetY, minX, maxX, minY, maxY, top, bottom, left, right: rightEdge }
}
