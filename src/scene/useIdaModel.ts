import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { Mesh } from 'three'
import { useIdaMaterials, type MaterialRole } from './IdaMaterials'
export function useIdaModel(path: string, castShadow = true) {
  const { scene } = useGLTF(path, false, true)
  const materials = useIdaMaterials()
  return useMemo(() => {
    const model = scene.clone(true)
    model.traverse(object => {
      if (!(object instanceof Mesh)) return
      const original = Array.isArray(object.material) ? object.material[0] : object.material
      const role = original.name.replace(/^Ida|Material$/g, '') as MaterialRole
      if (!materials[role]) throw new Error(`Unknown asset material: ${original.name}`)
      object.material = materials[role]
      object.castShadow = castShadow && !['Light', 'Bulb', 'WindowWarm'].includes(role)
      object.receiveShadow = true
    })
    return model
  }, [scene, materials, castShadow])
}
