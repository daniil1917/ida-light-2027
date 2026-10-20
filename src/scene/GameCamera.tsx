import { isFinalState } from '../game/types'
import { useMemo, useRef } from 'react'
import { OrthographicCamera } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { OrthographicCamera as ThreeCamera, Vector3 } from 'three'
import { useGameStore } from '../game/store'
import { useDevSettings } from '../game/devSettings'
import { VISUAL_CONFIG as V } from '../app/visualConfig'
import { useReducedMotion } from 'motion/react'
import { celebrationClock as clock, ramp, smooth } from '../effects/timeline'
import { CELEBRATION as C } from '../effects/celebrationConfig'
import { cameraFraming } from './cameraFraming'

export function GameCamera() {
  const camera = useRef<ThreeCamera>(null)
  const target = useRef(new Vector3(...V.cameraTarget))
  const size = useThree(s => s.size)
  const state = useGameStore(s => s.state)
  const floors = useGameStore(s => s.floors)
  const collapse = useGameStore(s => s.collapse)
  const zoomFactor = useDevSettings(s => s.cameraZoom)
  // The finished house keeps its overview as the card arrives over the same sky.
  const framing = useMemo(() => cameraFraming(state === 'greeting' ? 'celebration' : state, floors, collapse, size.width, size.height, 0,
    import.meta.env.DEV ? zoomFactor : 1), [state, floors, collapse, size.width, size.height, zoomFactor])
  const reducedMotion = useReducedMotion()
  const zoomInitialized = useRef(false)
  const cameraSize = useRef({ width: 0, height: 0 })
  const overviewStart = useRef<{ sessionId: number; target: Vector3; zoom: number } | null>(null)
  useFrame((_, delta) => {
    if (!camera.current) return
    const game = useGameStore.getState()
    if (game.paused && game.collapse) return
    const resized = cameraSize.current.width !== size.width || cameraSize.current.height !== size.height
    cameraSize.current = size
    const complete = isFinalState(game.state)
    const factor = 1 - Math.exp(-V.cameraDamping * Math.min(delta, 0.05))
    const { zoom: desiredZoom, targetX, targetY } = framing
    if (complete) {
      if (overviewStart.current?.sessionId !== game.sessionId) overviewStart.current = { sessionId: game.sessionId, target: target.current.clone(), zoom: camera.current.zoom }
      const start = overviewStart.current
      const progress = reducedMotion || clock.reduced ? 1 : smooth(ramp(clock.elapsed, C.camera, C.cameraDuration))
      if (progress < 1 || reducedMotion || clock.reduced) {
        target.current.x = start.target.x + (targetX - start.target.x) * progress
        target.current.y = start.target.y + (targetY - start.target.y) * progress
        camera.current.zoom = start.zoom + (desiredZoom - start.zoom) * progress
      } else {
        // Continue damping through viewport changes in the final overview.
        target.current.x += (targetX - target.current.x) * factor
        target.current.y += (targetY - target.current.y) * factor
        camera.current.zoom += (desiredZoom - camera.current.zoom) * factor
      }
    } else {
      overviewStart.current = null
      // Starting or replaying a session keeps the existing view. Only first
      // setup, viewport changes and reduced motion need an immediate fit.
      if (!zoomInitialized.current || resized || reducedMotion) {
        target.current.set(targetX, targetY, 0)
        camera.current.zoom = desiredZoom
      } else {
        target.current.x += (targetX - target.current.x) * factor
        target.current.y += (targetY - target.current.y) * factor
        camera.current.zoom += (desiredZoom - camera.current.zoom) * factor
      }
    }
    zoomInitialized.current = true
    camera.current.updateProjectionMatrix()
    const age = game.feedback ? (performance.now() - game.feedback.createdAt) / 1000 : 1
    const intensity = game.feedback?.result === 'fail' ? V.failImpulse : game.feedback?.result === 'success' ? V.successImpulse : 0
    const shake = !reducedMotion && age < V.impactDuration ? Math.sin(age * 62) * intensity * (1 - age / V.impactDuration) : 0
    camera.current.position.set(target.current.x + V.cameraDistance[0] + shake, target.current.y + V.cameraDistance[1], V.cameraDistance[2])
    camera.current.lookAt(target.current)
  })
  return <OrthographicCamera ref={camera} makeDefault position={V.cameraPosition} near={0.1} far={120} />
}
