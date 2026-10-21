import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, InstancedBufferAttribute, InstancedMesh, type Material } from 'three'
import type { PlacedFloor } from '../../game/types'
import { GAME_CONFIG as G } from '../../game/gameConfig'
import { useWinterAssets, type WinterPart } from '../WinterAssets'
import { towerBuffers } from './towerBuffers'

function PartInstances({ part, buffers, snow, wreath, activeFloor }: {
  part: WinterPart; buffers: ReturnType<typeof towerBuffers>; snow: boolean; wreath: boolean; activeFloor?: RefObject<Group | null>
}) {
  const ref = useRef<InstancedMesh>(null)
  const geometry = useMemo(() => {
    if (!snow) return part.geometry
    const clone = part.geometry.clone()
    // Snow is compressed only beneath the actual footprint of the next module.
    clone.setAttribute('snowCover', new InstancedBufferAttribute(new Float32Array((G.targetFloors + 1) * 2), 2))
    return clone
  }, [part, snow])
  const material = useMemo(() => {
    if (!snow) return part.material
    const clone = (part.material as Material).clone()
    clone.onBeforeCompile = shader => {
      shader.vertexShader = 'attribute vec2 snowCover;\n' + shader.vertexShader
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        if (snowCover.y > .5 && abs(transformed.x - snowCover.x) < ${(G.floorWidth / 2).toFixed(4)} && abs(transformed.z) < ${(G.floorDepth / 2).toFixed(4)}) {
          transformed.y = min(transformed.y, ${(G.floorHeight / 2 - .003).toFixed(4)});
        }`)
    }
    clone.customProgramCacheKey = () => 'winter-compressed-snow-v1'
    return clone
  }, [part, snow])
  useEffect(() => () => { if (snow) { geometry.dispose(); (material as Material).dispose() } }, [geometry, material, snow])
  useLayoutEffect(() => {
    const mesh = ref.current!
    const cover = geometry.getAttribute('snowCover') as InstancedBufferAttribute | undefined
    buffers.forEach((buffer, index) => {
      mesh.setMatrixAt(index, buffer.matrix)
      cover?.setXY(index, ...buffer.snowCover)
    })
    if (buffers.length <= G.targetFloors) cover?.setXY(buffers.length, 0, 0)
    mesh.instanceMatrix.needsUpdate = true
    if (cover) cover.needsUpdate = true
  }, [buffers, geometry])
  useFrame(() => {
    const mesh = ref.current, active = activeFloor?.current
    if (!mesh) return
    mesh.count = buffers.length
    if (!active?.visible) return
    // This slot becomes a placed floor in the same mesh/material at contact.
    // No second model, removal frame or non-instanced shader swap is involved.
    active.updateMatrix()
    mesh.setMatrixAt(buffers.length, active.matrix)
    mesh.count++
    mesh.instanceMatrix.needsUpdate = true
  }, -7)
  return <instancedMesh ref={ref} name={`Static_${snow ? 'Snow' : wreath ? 'Wreath' : 'Body'}`}
    args={[geometry, material, G.targetFloors + 1]} count={buffers.length} frustumCulled={false} dispose={null} />
}
export function StaticFloors({ floors, firstFloor = 1, activeFloor }: { floors: PlacedFloor[]; firstFloor?: number; activeFloor?: RefObject<Group | null> }) {
  const models = useWinterAssets()
  const buffers = useMemo(() => towerBuffers(floors, firstFloor), [floors, firstFloor])
  const wreaths = useMemo(() => buffers.filter(buffer => buffer.wreath), [buffers])
  const number = firstFloor + floors.length
  const activeWreath = number <= 1 || number % 4 === 0
  return <group name="StaticTower">{['FloorBody', 'SnowCap', 'Wreath'].flatMap(name => models[name].map((part, i) =>
    <PartInstances key={`${name}_${i}`} part={part} buffers={name === 'Wreath' ? wreaths : buffers} snow={name === 'SnowCap'} wreath={name === 'Wreath'}
      activeFloor={name !== 'Wreath' || activeWreath ? activeFloor : undefined} />))}</group>
}
