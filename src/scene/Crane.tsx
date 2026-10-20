import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, InstancedMesh, Matrix4 } from 'three'
import { useGameStore } from '../game/store'
import { swingPosition } from '../game/swing'
import { GAME_CONFIG as G } from '../game/gameConfig'
import { useWinterAssets, WinterModel } from './WinterAssets'
import { craneSections, craneReach, CRANE_MAX_SECTIONS, CRANE_BOOM_HEIGHT } from './craneLayout'
import layout from '../assets/winter-layout.json'

export function Crane() {
  const models = useWinterAssets()
  const count = useGameStore(s => s.currentFloor)
  const phase = useGameStore(s => s.phase)
  const state = useGameStore(s => s.state)
  const floors = useGameStore(s => s.floors)
  const reach = useMemo(() => craneReach(floors.map(f => f.x)), [floors])
  const sections = useMemo(() => craneSections(count), [count])
  const mast = useRef<InstancedMesh[]>([])
  const rails = useRef<Group>(null)
  const trolley = useRef<Group>(null)
  const extent = useRef(reach)
  const boomY = CRANE_BOOM_HEIGHT + count * G.floorHeight
  const boom = useMemo(() => models.Boom.map(part => {
    const geometry = part.geometry.clone(), positions = geometry.getAttribute('position')
    // Move the front crosshead forward, stretching only the dogleg between it and the mast.
    // The rear jib and the thickness of the front sleeves stay unchanged.
    const extra = -G.craneMastZ - 1.1
    for (let i = 0; i < positions.count; i++) {
      const z = positions.getZ(i)
      const t = Math.max(0, Math.min(1, (z - .15) / .75))
      positions.setZ(i, z + extra * t)
    }
    geometry.computeVertexNormals(); geometry.computeBoundingSphere()
    return { ...part, geometry }
  }), [models])
  const railParts = useMemo(() => Array.from({ length: 3 }, (_, i) => models[`Rail_${i}`].map(part => {
    const geometry = part.geometry.clone()
    geometry.scale(1 / layout.crane.railLengths[i], 1, 1)
    return { ...part, geometry }
  })), [models])
  useEffect(() => () => [...boom, ...railParts.flat()].forEach(part => part.geometry.dispose()), [boom, railParts])
  useLayoutEffect(() => {
    mast.current.forEach(mesh => {
      mesh.count = sections.length
      sections.forEach((section, i) => {
        const matrix = new Matrix4().makeScale(1, section.height / layout.crane.mastSectionHeight, 1)
        matrix.setPosition(G.craneMastX, section.y, G.craneMastZ)
        mesh.setMatrixAt(i, matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
    })
  }, [sections])
  useFrame((frame, delta) => {
    const x = swingPosition(frame.clock.oldTime)
    if (trolley.current) trolley.current.position.x = x
    const damping = 1 - Math.exp(-12 * Math.min(delta, .05))
    extent.current.min += (reach.min - extent.current.min) * damping
    extent.current.max += (reach.max - extent.current.max) * damping
    const min = Math.min(extent.current.min, x - .3), max = Math.max(extent.current.max, x + .3)
    rails.current?.children.forEach((section, i) => {
      const left = i < 3, stage = i % 3
      const start = left ? min : G.craneMastX
      const length = (left ? G.craneMastX - min : max - G.craneMastX) / 3
      section.position.x = start + stage * length
      section.scale.x = length + .06
    })
  }, -10)
  return <group name="WinterCrane">
    <group position={[G.craneMastX - layout.crane.mastAnchor[0], .02, G.craneMastZ - layout.crane.mastAnchor[2]]}><WinterModel name="Foot" /></group>
    {models.MastSection.map((part, i) => <instancedMesh key={i} ref={mesh => { if (mesh) mast.current[i] = mesh }}
      args={[part.geometry, part.material, CRANE_MAX_SECTIONS]} count={0} frustumCulled={false} dispose={null} />)}
    <group position={[G.craneMastX, boomY, G.craneMastZ]}>{boom.map((part, i) => <mesh key={i} geometry={part.geometry} material={part.material} dispose={null} />)}</group>
    <group ref={rails} position={[0, boomY, 0]}>{[0, 1, 2, 3, 4, 5].map(i => <group key={i}>
      {railParts[i < 3 ? 2 - i : i % 3].map((part, j) => <mesh key={j} geometry={part.geometry} material={part.material} dispose={null} />)}
    </group>)}</group>
    <group ref={trolley} name="Trolley" position={[0, boomY - .2, 0]}
      visible={phase === 'swinging' && ['loading', 'intro', 'tutorial', 'playing'].includes(state)}>
      <WinterModel name="Trolley" />
      <group position={[0, -.6025, 0]}><WinterModel name="Hoist" /></group>
      <group position={[0, -1.115, 0]}><WinterModel name="Spreader" /></group>
    </group>
  </group>
}
