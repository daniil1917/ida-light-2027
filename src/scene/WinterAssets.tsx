import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { DoubleSide, Matrix4, Mesh, MeshPhysicalMaterial, type BufferGeometry, type Material, type MeshStandardMaterial } from 'three'
import { bakeGeometry } from '../assets/bakeGeometry'
import { applyReferenceToneMapping } from './referenceToneMapping'
import { publicAsset } from '../app/publicAsset'

export type WinterPart = { geometry: BufferGeometry; material: Material | Material[] }
type WinterModels = Record<string, WinterPart[]>
const Context = createContext<WinterModels | null>(null)
export const WINTER_PROFILE = (() => {
  const explicit = new URLSearchParams(location.search).get('quality')
  return explicit === 'high' || explicit === 'mobile' ? explicit : matchMedia('(max-width: 700px) and (pointer: coarse)').matches ? 'mobile' : 'high'
})()
const urls = ['floor', 'snow-cap', 'wreath', 'site', 'crane'].map(name => publicAsset(`winter/${WINTER_PROFILE}/winter-${name}.glb`))

export function WinterAssets({ children }: { children: ReactNode }) {
  const models = useGLTF(urls, false, true)
  const renderer = useThree(s => s.gl)
  const parts = useMemo(() => {
    const materialCache = new Map<Material, Material>()
    const configure = (source: Material) => {
      const cached = materialCache.get(source)
      if (cached) return cached
      const material = source.name.includes('Windows •')
        ? new MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: .075, roughness: .12,
          metalness: 0, depthWrite: false, transmission: 0, envMapIntensity: .15, side: DoubleSide })
        : source.clone()
      if (material.transparent) material.forceSinglePass = true
      const standard = material as MeshStandardMaterial
      if (source.name.startsWith('WinterBaked_')) {
        material.toneMapped = false
        if (standard.map) standard.map.anisotropy = renderer.capabilities.getMaxAnisotropy()
      }
      applyReferenceToneMapping(material)
      materialCache.set(source, material)
      return material
    }
    const result: WinterModels = {}
    for (const { scene } of models) {
      scene.updateMatrixWorld(true)
      for (const root of scene.children) {
        const inverse = new Matrix4().copy(root.matrixWorld).invert()
        const list: WinterPart[] = []
        root.traverse(object => {
          if (!(object instanceof Mesh)) return
          list.push({ geometry: bakeGeometry(object.geometry, new Matrix4().multiplyMatrices(inverse, object.matrixWorld)),
            material: Array.isArray(object.material) ? object.material.map(configure) : configure(object.material) })
        })
        result[root.name] = list
      }
    }
    return result
  }, [models, renderer])
  useEffect(() => () => {
    const materials = new Set<Material>()
    Object.values(parts).flat().forEach(part => {
      part.geometry.dispose()
      ;(Array.isArray(part.material) ? part.material : [part.material]).forEach(material => materials.add(material))
    })
    materials.forEach(material => material.dispose())
  }, [parts])
  return <Context.Provider value={parts}>{children}</Context.Provider>
}
export function useWinterAssets() {
  const models = useContext(Context)
  if (!models) throw new Error('Winter scene requires its asset provider')
  return models
}
export function WinterModel({ name }: { name: string }) {
  const parts = useWinterAssets()[name]
  if (!parts) throw new Error(`Missing winter model: ${name}`)
  return <>{parts.map((part, i) => <mesh key={i} geometry={part.geometry} material={part.material} dispose={null} />)}</>
}
