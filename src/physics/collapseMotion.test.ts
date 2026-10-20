import { beforeAll, describe, expect, it } from 'vitest'
import R from '@dimforge/rapier3d-compat'
import type { ImpulseJoint } from '@dimforge/rapier3d-compat'
import { GAME_CONFIG as G } from '../game/gameConfig'
import { collapseDurationMs, findTowerCollapse } from '../game/stability'
import { attachCollapseHinge, releaseCollapseHinge, settleCollapse, COLLAPSE_PHYSICS as C } from './collapseMotion'

beforeAll(async () => { await R.init() })

function simulate(direction: -1 | 1, count: number, step: number) {
  const floors = Array.from({ length: count }, (_, i) => ({ id: i, x: direction * (i + 1) * step,
    y: G.baseHeight + (i + .5) * G.floorHeight, perfect: false }))
  const collapse = findTowerCollapse(floors)!
  const world = new R.World({ x: 0, y: G.gravity, z: 0 })
  world.timestep = 1 / 60
  // Match React Rapier: create at zero, then apply the scene pose before stepping.
  const body = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased()
    .setLinearDamping(C.linearDamping).setAngularDamping(C.angularDamping).setAdditionalSolverIterations(C.solverIterations).setCcdEnabled(true))
  for (const f of floors.slice(collapse.fromFloor)) world.createCollider(R.ColliderDesc.cuboid(G.floorWidth / 2, G.floorHeight / 2, G.floorDepth / 2)
    .setTranslation(f.x - collapse.pivotX, f.y - collapse.pivotY, 0).setMass(1).setFriction(.8).setRestitution(0)
    .setActiveEvents(R.ActiveEvents.COLLISION_EVENTS), body)
  body.setTranslation({ x: collapse.pivotX, y: collapse.pivotY, z: 0 }, false)
  const anchor = world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(collapse.pivotX, collapse.pivotY, 0))
  let joint: ImpulseJoint | null = attachCollapseHinge(R, world, body, anchor)
  const groundBody = world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(0, -.1, 0))
  const ground = world.createCollider(R.ColliderDesc.cuboid(40, .1, 20).setFriction(.8).setRestitution(0), groundBody)
  const queue = new R.EventQueue(true)
  const frames: { angle: number; y: number; centerY: number; pinned: boolean }[] = []
  const duration = collapseDurationMs(floors, collapse)
  for (let i = 0; i < duration / 1000 * 60; i++) {
    joint = releaseCollapseHinge(world, body, joint, direction)
    world.step(queue)
    queue.drainCollisionEvents((a, b, started) => { if (started && [a, b].includes(ground.handle)) settleCollapse(body) })
    const rotation = body.rotation()
    frames.push({ angle: -direction * 2 * Math.atan2(rotation.z, rotation.w), y: body.translation().y,
      centerY: body.worldCom().y, pinned: Boolean(joint) })
  }
  queue.free(); world.free()
  return { frames, pivotY: collapse.pivotY, duration }
}

describe('gravity-driven tower collapse', () => {
  for (const direction of [-1, 1] as const) it(`tilts without launching, breaks its support, then settles (${direction})`, () => {
    const { frames, pivotY, duration } = simulate(direction, 5, G.floorWidth * .3)
    expect(duration).toBe(G.collapseDelayMs)
    const pinned = frames.filter(f => f.pinned)
    expect(pinned.length).toBeGreaterThan(30)
    expect(pinned.length).toBeLessThan(120)
    expect(Math.max(...pinned.map(f => Math.abs(f.y - pivotY)))).toBeLessThan(.002)
    expect(frames[30].angle).toBeGreaterThan(frames[10].angle)
    // No initial upward movement of the centre of mass, including hinge release.
    for (let i = 1; i < 90; i++) expect(frames[i].centerY - frames[i - 1].centerY).toBeLessThan(.002)
    expect(frames.at(-1)!.centerY).toBeLessThan(frames[0].centerY / 2)
    expect(frames.at(-1)!.angle).toBeGreaterThan(Math.PI / 6)
    expect(Math.abs(frames.at(-1)!.y - frames.at(-30)!.y)).toBeLessThan(.05)
  })
  for (const direction of [-1, 1] as const) it(`lets an 18-floor tower reach the ground before restarting (${direction})`, () => {
    const { frames, duration } = simulate(direction, 18, .3)
    expect(duration).toBeGreaterThan(G.collapseDelayMs)
    expect(frames.at(-1)!.pinned).toBe(false)
    expect(frames.at(-1)!.centerY).toBeLessThan(frames[0].centerY * .5)
    expect(frames.at(-1)!.angle).toBeGreaterThan(1.1)
    expect(Math.abs(frames.at(-1)!.y - frames.at(-30)!.y)).toBeLessThan(.05)
  })
})
