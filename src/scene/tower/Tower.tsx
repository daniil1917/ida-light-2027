import { ASSETS } from '../../assets/assetPaths'
import { useIdaModel } from '../useIdaModel'

export function Tower() {
  const base = useIdaModel(ASSETS.base)
  return <group>
    <primitive object={base} dispose={null} />
  </group>
}
