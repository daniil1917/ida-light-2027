import type Rapier from '@dimforge/rapier3d-compat'
import type { World, RigidBody, ImpulseJoint } from '@dimforge/rapier3d-compat'

export const COLLAPSE_PHYSICS = { breakAngle: Math.PI / 6, linearDamping: .45, angularDamping: .65, solverIterations: 8 } as const

export function attachCollapseHinge(rapier: typeof Rapier, world: World, body: RigidBody, anchor: RigidBody) {
  // React creates bodies at the origin, then applies their scene transforms.
  // Sync collider poses before CCD so the first step cannot sweep from y=0.
  world.propagateModifiedBodyPositionsToColliders()
  // Keep the initial React mount motionless until every collider has its pose.
  body.setBodyType(rapier.RigidBodyType.Dynamic, true)
  body.recomputeMassPropertiesFromColliders()
  return world.createImpulseJoint(rapier.JointData.revolute({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }), anchor, body, true)
}

export function releaseCollapseHinge(world: World, body: RigidBody, joint: ImpulseJoint | null, direction: -1 | 1) {
  if (!joint) return null
  const rotation = body.rotation()
  const angle = -direction * 2 * Math.atan2(rotation.z, rotation.w)
  if (angle < COLLAPSE_PHYSICS.breakAngle) return joint
  // Preserve the velocity acquired under gravity, without a launch impulse.
  world.removeImpulseJoint(joint, true)
  return null
}

export function settleCollapse(body: RigidBody) {
  // A heavy frame absorbs its ground impact instead of rebounding like a box.
  const v = body.linvel()
  body.setLinvel({ x: v.x * .3, y: Math.min(0, v.y), z: v.z * .3 }, true)
  body.setLinearDamping(1.2)
  body.setAngularDamping(1.8)
}
