import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { AdditiveBlending, CanvasTexture, Color, InstancedMesh, Matrix4, Vector3 } from 'three'
import layout from '../assets/winter-layout.json'
import { useGameStore } from '../game/store'
import { GAME_CONFIG as G } from '../game/gameConfig'
export function WinterGlows() {
  const camera = useThree(s => s.camera)
  const floors = useGameStore(s => s.floors)
  const collapse = useGameStore(s => s.collapse)
  const ref = useRef<InstancedMesh>(null)
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64
    const context = canvas.getContext('2d')!, gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(255,255,255,.6)'); gradient.addColorStop(.35, 'rgba(255,255,255,.2)'); gradient.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = gradient; context.fillRect(0, 0, 64, 64)
    return new CanvasTexture(canvas)
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  useLayoutEffect(() => {
    const points = [...layout.glow.site]
    for (const pose of [{ x: 0, y: G.baseHeight / 2 }, ...(collapse ? floors.slice(0, collapse.fromFloor) : floors)]) {
      layout.glow.floor.forEach(point => points.push({ ...point, position: [point.position[0] + pose.x, point.position[1] + pose.y, point.position[2]] }))
    }
    const mesh = ref.current!
    mesh.count = points.length
    points.forEach((point, i) => {
      mesh.setMatrixAt(i, new Matrix4().compose(new Vector3(...point.position as [number, number, number]), camera.quaternion,
        new Vector3(point.radius * 2, point.radius * 2, 1)))
      mesh.setColorAt(i, new Color(point.color))
    })
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor!.needsUpdate = true
  }, [camera, floors, collapse])
  return <instancedMesh ref={ref} args={[undefined, undefined, layout.glow.site.length + layout.glow.floor.length * (G.targetFloors + 1)]}
    frustumCulled={false} dispose={null}><planeGeometry args={[1, 1]} />
    <meshBasicMaterial map={texture} transparent depthWrite={false} blending={AdditiveBlending} opacity={.2} toneMapped={false} />
  </instancedMesh>
}
