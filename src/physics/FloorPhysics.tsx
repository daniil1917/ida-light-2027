import { CuboidCollider, RigidBody, interactionGroups } from '@react-three/rapier'
import { GAME_CONFIG as G } from '../game/gameConfig'
import { useGameStore } from '../game/store'

export function TowerSupport() {
  const floors = useGameStore(s => s.floors)
  const collapse = useGameStore(s => s.collapse)
  const supportCount = collapse?.fromFloor ?? floors.length
  const topY = G.baseHeight + supportCount * G.floorHeight
  const x = floors[supportCount - 1]?.x ?? 0
  // A changed support needs a fresh fixed pose before the next physics step.
  return <RigidBody key={`${supportCount}:${x}`} type="fixed" colliders={false} position={[x, topY - G.supportThickness / 2, 0]} name="tower-support">
    <CuboidCollider args={[G.floorWidth / 2, G.supportThickness / 2, G.floorDepth / 2]} collisionGroups={interactionGroups(0, [0])} friction={0.3} restitution={0} />
  </RigidBody>
}
