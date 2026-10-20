import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useTexture } from '@react-three/drei'
import { MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, Vector2 } from 'three'
import brand from '../app/brand.json'
import scenePalette from './scenePalette.json'
import { publicAsset } from '../app/publicAsset'
export type MaterialRole = 'Facade' | 'Glass' | 'Metal' | 'Snow' | 'Light' | 'Ground' | 'Accent' | 'Foliage' | 'Backdrop' | 'Holiday' | 'Road' | 'Bulb' | 'WindowWarm' | 'Wood'
type Materials = Record<MaterialRole, MeshStandardMaterial>
const MaterialContext = createContext<Materials | null>(null)
export function IdaMaterials({ children }: { children: ReactNode }) {
  const [normal, roughness, light] = useTexture(['/textures/concrete-normal.webp',
    '/textures/concrete-roughness.webp', '/textures/window-room.svg'].map(publicAsset))
  const materials = useMemo<Materials>(() => {
    const { blue, black, white, lightGray } = brand.colors
    for (const texture of [normal, roughness]) { texture.wrapS = texture.wrapT = RepeatWrapping; texture.repeat.set(2, 2) }
    light.colorSpace = SRGBColorSpace
    const result = {
      Facade: new MeshStandardMaterial({ color: scenePalette.Facade, normalMap: normal, normalScale: new Vector2(.12, .12), roughnessMap: roughness, roughness: .85 }),
      Glass: new MeshStandardMaterial({ color: scenePalette.Glass, metalness: .08, roughness: .35 }),
      Metal: new MeshStandardMaterial({ color: scenePalette.Metal, metalness: .12, roughness: .65 }),
      Snow: new MeshStandardMaterial({ color: white, roughness: 1 }),
      Light: new MeshStandardMaterial({ color: '#fff6e8', emissive: '#f4dcc0', emissiveIntensity: .45, map: light,
        emissiveMap: light, transparent: true, alphaTest: .02, depthWrite: false, roughness: .8 }),
      Ground: new MeshStandardMaterial({ color: lightGray, roughness: 1 }),
      Accent: new MeshStandardMaterial({ color: blue, roughness: .7 }),
      Foliage: new MeshStandardMaterial({ color: black, roughness: 1 }),
      Backdrop: new MeshStandardMaterial({ color: scenePalette.Backdrop, roughness: 1 }),
      Holiday: new MeshStandardMaterial({ color: white, vertexColors: true, roughness: .85 }),
      Road: new MeshStandardMaterial({ color: scenePalette.Road, roughness: .82 }),
      Bulb: new MeshStandardMaterial({ color: scenePalette.Bulb, emissive: '#ffe7c6', emissiveIntensity: 1.7 }),
      WindowWarm: new MeshStandardMaterial({ color: scenePalette.WindowWarm, emissive: '#f4dcc0', emissiveIntensity: .45, roughness: .5 }),
      Wood: new MeshStandardMaterial({ color: scenePalette.Wood, roughness: 1 }),
    }
    for (const role of ['Facade', 'Metal', 'Snow', 'Ground', 'Accent', 'Foliage', 'Backdrop', 'Road', 'Wood'] as const) result[role].vertexColors = true
    return result
  }, [normal, roughness, light])
  useEffect(() => () => Object.values(materials).forEach(material => material.dispose()), [materials])
  return <MaterialContext.Provider value={materials}>{children}</MaterialContext.Provider>
}
export function useIdaMaterials() {
  const materials = useContext(MaterialContext)
  if (!materials) throw new Error('IdaMaterials provider is missing')
  return materials
}
