import { useEffect, useRef, type ReactNode } from 'react'
import { CuboidCollider, RigidBody, interactionGroups, useBeforePhysicsStep, useRapier, type RapierRigidBody } from '@react-three/rapier'
import type { ImpulseJoint } from '@dimforge/rapier3d-compat'
import { GAME_CONFIG as G } from '../game/gameConfig'
import type { PlacedFloor } from '../game/types'
import type { TowerCollapse } from '../game/stability'
import { useFrame } from '@react-three/fiber'
import { useSceneStats } from '../scene/debugStats'
import { attachCollapseHinge, releaseCollapseHinge, settleCollapse, COLLAPSE_PHYSICS as C } from './collapseMotion'

export function CollapsingTower({ collapse, floors, children }: {
  collapse: TowerCollapse; floors: PlacedFloor[]; children: ReactNode
}) {
  const body = useRef<RapierRigidBody>(null)
  const anchor = useRef<RapierRigidBody>(null)
  const ground = useRef<RapierRigidBody>(null)
  const hinge = useRef<ImpulseJoint | null>(null)
  const elapsed = useRef(0)
  const { world, rapier } = useRapier()
  useEffect(() => {
    if (!body.current || !anchor.current) return
    hinge.current = attachCollapseHinge(rapier, world, body.current, anchor.current)
    if (import.meta.env.DEV) useSceneStats.setState({ collapseAngle: 0, collapseY: collapse.pivotY })
    return () => {
      if (hinge.current && world.getImpulseJoint(hinge.current.handle)) world.removeImpulseJoint(hinge.current, true)
      hinge.current = null
    }
  }, [world, rapier])
  useBeforePhysicsStep(() => {
    if (body.current) hinge.current = releaseCollapseHinge(world, body.current, hinge.current, collapse.direction)
  })
  useFrame((_, delta) => {
    if (!import.meta.env.DEV || !body.current) return
    elapsed.current += delta
    if (elapsed.current < .25) return
    elapsed.current = 0
    const rotation = body.current.rotation()
    useSceneStats.setState({ collapseAngle: Math.atan2(rotation.z, rotation.w) * 360 / Math.PI,
      collapseY: body.current.translation().y })
  })
  const pivot: [number, number, number] = [collapse.pivotX, collapse.pivotY, 0]
  return <>
    <RigidBody ref={anchor} type="fixed" colliders={false} position={pivot} name="collapse-pivot" />
    <RigidBody ref={body} type="kinematicPosition" name="collapsing-tower" position={pivot} colliders={false} ccd
      linearDamping={C.linearDamping} angularDamping={C.angularDamping} additionalSolverIterations={C.solverIterations}
      onCollisionEnter={({ other }) => { if (body.current && other.rigidBody?.handle === ground.current?.handle) settleCollapse(body.current) }}>
      {floors.map(floor => <CuboidCollider key={floor.id} mass={1} friction={.8} restitution={0}
        collisionGroups={interactionGroups(1, [2])}
        position={[floor.x - collapse.pivotX, floor.y - collapse.pivotY, 0]}
        args={[G.floorWidth / 2, G.floorHeight / 2, G.floorDepth / 2]} />)}
      <group position={[-collapse.pivotX, -collapse.pivotY, 0]}>{children}</group>
    </RigidBody>
    <RigidBody ref={ground} type="fixed" colliders={false} position={[0, -.1, 0]} name="collapse-ground">
      <CuboidCollider args={[40, .1, 20]} collisionGroups={interactionGroups(2, [1])} friction={.8} restitution={0} />
    </RigidBody>
  </>
}
