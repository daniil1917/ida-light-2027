import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { InstancedBufferAttribute, InstancedMesh, type Material } from 'three'
import type { PlacedFloor } from '../../game/types'
import { GAME_CONFIG as G } from '../../game/gameConfig'
import { useWinterAssets, type WinterPart } from '../WinterAssets'
import { towerBuffers } from './towerBuffers'

function PartInstances({ part, floors, snow, wreath, firstFloor }: {
  part: WinterPart; floors: PlacedFloor[]; snow: boolean; wreath: boolean; firstFloor: number
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
    let index = 0
    towerBuffers(floors, firstFloor).forEach(buffer => {
      if (wreath && !buffer.wreath) return
      mesh.setMatrixAt(index, buffer.matrix)
      cover?.setXY(index, ...buffer.snowCover)
      index++
    })
    mesh.count = index
    mesh.instanceMatrix.needsUpdate = true
    if (cover) cover.needsUpdate = true
  }, [floors, geometry, wreath, firstFloor])
  return <instancedMesh ref={ref} name={`Static_${snow ? 'Snow' : wreath ? 'Wreath' : 'Body'}`}
    args={[geometry, material, G.targetFloors + 1]} count={0} frustumCulled={false} dispose={null} />
}
export function StaticFloors({ floors, firstFloor = 1 }: { floors: PlacedFloor[]; firstFloor?: number }) {
  const models = useWinterAssets()
  return <group name="StaticTower">{['FloorBody', 'SnowCap', 'Wreath'].flatMap(name => models[name].map((part, i) =>
    <PartInstances key={`${name}_${i}`} part={part} floors={floors} firstFloor={firstFloor} snow={name === 'SnowCap'} wreath={name === 'Wreath'} />))}</group>
}
