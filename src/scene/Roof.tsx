import { Center, Text3D } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Group } from 'three'
import brand from '../app/brand.json'
import { ASSETS } from '../assets/assetPaths'
import { useGameStore } from '../game/store'
import { celebrationClock as clock } from '../effects/timeline'
import { CELEBRATION as C } from '../effects/celebrationConfig'
export function Roof({ active }: { active: boolean }) {
  const top = useGameStore(s => s.floors.at(-1))
  const group = useRef<Group>(null)
  useFrame(() => { if (group.current) group.current.visible = active && (clock.reduced || clock.elapsed >= C.year) })
  return <group ref={group} visible={false} position={[top?.x ?? 0, (top?.y ?? 0) + 1.18, 0]}>
    <Center><Text3D font={ASSETS.font} size={.8} height={.075} curveSegments={24}
      bevelEnabled bevelThickness={.008} bevelSize={.008} bevelSegments={2}>
      2027<meshStandardMaterial color={brand.colors.blue} roughness={.25} metalness={.2} emissive={brand.colors.blue} emissiveIntensity={.18} />
    </Text3D></Center>
  </group>
}
