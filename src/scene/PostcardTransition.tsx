import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { useReducedMotion } from 'motion/react'
import type { Group } from 'three'
import { useGameStore } from '../game/store'
import { GAME_CONFIG as G } from '../game/gameConfig'
import { CRANE_BOOM_HEIGHT } from './craneLayout'

/** Recede the finished miniature behind the card. Snow and sky stay continuous. */
export function PostcardTransition({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null)
  const progress = useRef(0)
  const reduced = !!useReducedMotion()
  const greeting = useGameStore(s => s.state === 'greeting')
  useLayoutEffect(() => {
    if (greeting || !group.current) return
    // Rapier captures its parent's world transform in passive mount effects.
    // Restore it before replay mounts bodies under the postcard's .16 scale.
    progress.current = 0
    group.current.scale.setScalar(1)
    group.current.position.set(0, 0, 0)
    group.current.visible = true
    group.current.updateWorldMatrix(true, true)
  }, [greeting])
  useFrame((_, delta) => {
    if (!group.current) return
    const game = useGameStore.getState()
    const greeting = game.state === 'greeting'
    if (!greeting) progress.current = 0
    else if (reduced) progress.current = 1
    else if (!game.paused) progress.current = Math.min(1, progress.current + Math.min(delta, .05) / .9)
    const p = progress.current, eased = p * p * (3 - 2 * p)
    const scale = 1 - eased * .84
    const pivotY = (CRANE_BOOM_HEIGHT + game.currentFloor * G.floorHeight) / 2
    group.current.scale.setScalar(scale)
    group.current.position.set(0, pivotY * (1 - scale), 0)
    group.current.visible = p < 1
  }, -1)
  return <group ref={group} name="Finished house to postcard">{children}</group>
}
