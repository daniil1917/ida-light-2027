import { useEffect, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody, useAfterPhysicsStep, type RapierCollider, type RapierRigidBody } from '@react-three/rapier'
import { Group } from 'three'
import { GAME_CONFIG as G } from '../../game/gameConfig'
import { useGameStore } from '../../game/store'
import { swingPosition } from '../../game/swing'
import { useMotionDiagnostics } from './motionDiagnostics'

export function ActiveFloor({ object }: { object: RefObject<Group | null> }) {
  const physicsObject = useRef<Group>(null)
  const carrier = useRef<Group>(null)
  const body = useRef<RapierRigidBody>(null)
  const collider = useRef<RapierCollider>(null)
  const resolved = useRef(false)
  const aliveFor = useRef(0)
  useMotionDiagnostics(object)
  const phase = useGameStore(s => s.phase)
  const state = useGameStore(s => s.state)
  const count = useGameStore(s => s.currentFloor)
  const attemptId = useGameStore(s => s.attemptId)
  const releaseX = useGameStore(s => s.releaseX)
  const landingY = G.baseHeight + (count + .5) * G.floorHeight
  const spawnY = landingY + G.dropHeight
  const visible = ['loading', 'intro', 'tutorial', 'playing'].includes(state) && ['swinging', 'falling', 'fail'].includes(phase)
  const falling = phase === 'falling' || phase === 'fail'

  useEffect(() => {
    if (!body.current || !physicsObject.current?.parent || !object.current) return
    carrier.current = physicsObject.current.parent as Group
    body.current.setEnabled(falling && visible)
    if (phase !== 'swinging' && phase !== 'falling') return
    const x = phase === 'falling' ? releaseX : swingPosition()
    body.current.setTranslation({ x, y: spawnY, z: 0 }, true)
    body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
    body.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
    body.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
    body.current.lockRotations(true, true)
    collider.current?.setSensor(false)
    carrier.current.position.set(x, spawnY, 0)
    carrier.current.quaternion.identity()
    object.current.position.set(x, spawnY, 0)
    object.current.quaternion.identity()
    resolved.current = false; aliveFor.current = 0
  }, [attemptId, phase, releaseX, spawnY, falling, visible])
  useFrame(frame => {
    if (phase !== 'swinging' || !carrier.current || !body.current) return
    const x = swingPosition(frame.clock.oldTime)
    carrier.current.position.set(x, spawnY, 0)
    body.current.setTranslation({ x, y: spawnY, z: 0 }, false)
    object.current?.position.set(x, spawnY, 0)
  }, -10)
  useFrame(() => {
    if (falling && object.current && carrier.current) {
      const landed = useGameStore.getState().floors.at(-1)
      if (resolved.current && landed?.id === attemptId) {
        object.current.position.set(landed.x, landed.y, 0)
        object.current.quaternion.identity()
      } else {
        object.current.position.copy(carrier.current.position)
        object.current.quaternion.copy(carrier.current.quaternion)
      }
    }
  }, -9)
  const resolve = () => {
    if (resolved.current || !body.current) return
    resolved.current = true
    useGameStore.getState().land(attemptId, body.current.translation().x)
    if (useGameStore.getState().phase === 'fail') {
      collider.current?.setSensor(true)
      body.current.lockRotations(false, true)
      const supportX = useGameStore.getState().floors.at(-1)?.x ?? 0
      const direction = Math.sign(releaseX - supportX) || 1
      body.current.setAngvel({ x: .15, y: .12, z: -direction * 1.5 }, true)
      body.current.setLinvel({ x: direction * .55, y: -2.4, z: 0 }, true)
    }
  }
  useAfterPhysicsStep(() => {
    if (phase !== 'falling' || !body.current || resolved.current) return
    aliveFor.current += 1 / 60
    if (body.current.translation().y <= landingY + .025) resolve()
    else if (aliveFor.current > G.floorTimeoutSeconds) useGameStore.getState().reportError('Не удалось завершить падение этажа. Открой игру снова.')
  })
  // The empty carrier drives a persistent tower instance, including at contact.
  // A fresh body handle prevents interpolation from the previous attempt's pose.
  return <><RigidBody key={attemptId} ref={body} name="falling-floor" type="dynamic" position={[0, 0, 0]} colliders={false}
    ccd enabledRotations={[false, false, false]} enabledTranslations={[true, true, false]}
    onCollisionEnter={({ other }) => { if (phase === 'falling' && other.rigidBodyObject?.name === 'tower-support') resolve() }}>
    <CuboidCollider ref={collider} args={[G.floorWidth / 2, G.floorHeight / 2, G.floorDepth / 2]} friction={.3} restitution={0} />
    <group ref={physicsObject} />
  </RigidBody><group ref={object} name="ActiveFloor" visible={visible} /></>
}
