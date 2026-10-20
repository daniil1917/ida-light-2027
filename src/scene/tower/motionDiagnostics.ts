import { useEffect, type RefObject } from 'react'
import { addAfterEffect, useThree } from '@react-three/fiber'
import { Group } from 'three'
import { useSceneStats } from '../debugStats'
import { useGameStore } from '../../game/store'

export function useMotionDiagnostics(carrier: RefObject<Group | null>) {
  const scene = useThree(s => s.scene)
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const trolley = scene.getObjectByName('Trolley')
    if (!trolley) return
    let worst = 0, samples = 0
    return addAfterEffect(() => {
      if (!carrier.current || useGameStore.getState().phase !== 'swinging') return
      worst = Math.max(worst, Math.abs(carrier.current.position.x - trolley.position.x))
      if (++samples % 60 === 0) {
        useSceneStats.setState({ motionError: worst }); worst = 0
      }
    })
  }, [carrier, scene])
}
