import { expect, test } from 'vitest'
import { OrthographicCamera, Vector3 } from 'three'
import { cameraFraming } from './cameraFraming'
import { VISUAL_CONFIG as V } from '../app/visualConfig'
import { GAME_CONFIG as G } from '../game/gameConfig'
import { CRANE_BOOM_HEIGHT } from './craneLayout'
import type { PlacedFloor } from '../game/types'
import { getDifficulty } from '../game/difficulty'

function camera(frame: ReturnType<typeof cameraFraming>, w: number, h: number) {
  const camera = new OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, .1, 120)
  camera.zoom = frame.zoom
  camera.position.set(frame.targetX + V.cameraDistance[0], frame.targetY + V.cameraDistance[1], V.cameraDistance[2])
  camera.lookAt(frame.targetX, frame.targetY, 0)
  camera.updateMatrixWorld(); camera.updateProjectionMatrix()
  return camera
}
function inside(point: number[], camera: OrthographicCamera, frame: ReturnType<typeof cameraFraming>, w: number, h: number) {
  const p = new Vector3(...point).project(camera)
  const x = (p.x + 1) * w / 2, y = (1 - p.y) * h / 2
  expect(x).toBeGreaterThanOrEqual(frame.left - .1); expect(x).toBeLessThanOrEqual(frame.right + .1)
  expect(y).toBeGreaterThanOrEqual(frame.top - .01); expect(y).toBeLessThanOrEqual(frame.bottom + .01)
}

test('the entire site and crane fit the intro at narrow, short and desktop sizes', () => {
  for (const [w, h] of [[320, 568], [390, 844], [430, 932], [600, 820], [600, 723], [600, 390]]) {
    const frame = cameraFraming('intro', [], null, w, h), cam = camera(frame, w, h)
    for (const x of [-5.52, 4.08]) for (const y of [-.81, 2.222]) for (const z of [-3.72, 4.844]) inside([x, y, z], cam, frame, w, h)
    inside([G.craneMastX, CRANE_BOOM_HEIGHT + .65, G.craneMastZ - 2.05], cam, frame, w, h)
    const left = new Vector3(-5.52, 0, 4.844).project(cam).x
    const right = new Vector3(4.08, 0, -3.72).project(cam).x
    const regionCentre = (frame.left + frame.right) / w - 1
    expect(Math.abs((left + right) / 2 - regionCentre)).toBeLessThan(.025)
  }
})

test('both ends of the moving floor and the support remain inside the gameplay area', () => {
  for (const [w, h] of [[320, 568], [390, 844], [600, 820]]) for (let count = 0; count < G.targetFloors; count++) {
    const floors: PlacedFloor[] = Array.from({ length: count }, (_, i) => ({ id: i, x: i % 2 ? 0 : .9, y: G.baseHeight + (i + .5) * G.floorHeight, perfect: false }))
    const frame = cameraFraming('playing', floors, null, w, h), cam = camera(frame, w, h)
    const support = floors.at(-1)?.x ?? 0, top = G.baseHeight + count * G.floorHeight
    for (const side of [-1, 1]) for (const corner of [-1, 1]) {
      inside([support + side * getDifficulty(count + 1).amplitude + corner * G.floorWidth / 2, top + G.dropHeight + G.floorHeight + .25, -G.floorDepth / 2], cam, frame, w, h)
      inside([support + corner * G.floorWidth / 2, top, G.floorDepth / 2], cam, frame, w, h)
    }
  }
})
