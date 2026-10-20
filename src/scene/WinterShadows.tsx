import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, Mesh, SRGBColorSpace } from 'three'
import { useGameStore } from '../game/store'
import { GAME_CONFIG as G } from '../game/gameConfig'
import { swingPosition } from '../game/swing'

export function WinterShadows() {
  const shadow = useRef<Mesh>(null)
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128
    const context = canvas.getContext('2d')!
    context.filter = 'blur(11px)'
    context.fillStyle = 'rgba(24,43,78,.25)'
    context.beginPath(); context.roundRect(20, 22, 88, 84, 9); context.fill()
    const result = new CanvasTexture(canvas); result.colorSpace = SRGBColorSpace
    return result
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  useFrame(frame => {
    if (!shadow.current) return
    const game = useGameStore.getState(), support = game.floors.at(-1)
    shadow.current.visible = ['swinging', 'falling'].includes(game.phase) && !game.collapse
    const x = game.phase === 'swinging' ? swingPosition(frame.clock.oldTime) : game.releaseX
    // Remains on the current roof and is clipped by its footprint.
    const centre = support?.x ?? 0, half = G.floorWidth / 2
    const left = Math.max(centre - half, x - half), right = Math.min(centre + half, x + half)
    shadow.current.position.set((left + right) / 2, G.baseHeight + game.currentFloor * G.floorHeight + .18, 0)
    shadow.current.scale.set(Math.max(0, right - left), G.floorDepth, 1)
  }, -8)
  return <><mesh rotation={[-Math.PI / 2, 0, 0]} position={[-.6, -.86, 0]}>
    <planeGeometry args={[13, 11]} /><meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} opacity={.65} />
  </mesh><mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
    <planeGeometry args={[1, 1]} /><meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
  </mesh></>
}
