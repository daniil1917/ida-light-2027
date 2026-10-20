import brand from '../app/brand.json'
import { isFinalState } from '../game/types'
import { useEffect, useRef } from 'react'
import type { CreateTypes } from 'canvas-confetti'
import { useReducedMotion } from 'motion/react'
import { useGameStore } from '../game/store'
import { useCelebrationStore } from './celebrationStore'

let confettiModule: Promise<typeof import('canvas-confetti')> | null = null
export const preloadConfetti = () => confettiModule ??= import('canvas-confetti').then(module => module.default)

export function ConfettiLayer() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const runner = useRef<CreateTypes | null>(null)
  const played = useRef<number | null>(null)
  const sessionId = useGameStore(s => s.sessionId)
  const paused = useGameStore(s => s.paused)
  const mode = useGameStore(s => s.performanceMode)
  const { phase, sessionId: cinematicSession, reduced: cinematicReduced } = useCelebrationStore()
  const reduced = !!useReducedMotion() || cinematicReduced
  useEffect(() => () => { runner.current?.reset() }, [])
  useEffect(() => { if (paused || reduced) runner.current?.reset() }, [paused, reduced])
  useEffect(() => {
    if (paused || reduced || cinematicSession !== sessionId || played.current === sessionId || !['confetti', 'ready'].includes(phase)) return
    let cancelled = false
    void preloadConfetti().then(confetti => {
      const game = useGameStore.getState()
      if (cancelled || !canvas.current || game.sessionId !== sessionId || !isFinalState(game.state) || game.paused) return
      const render = runner.current ?? confetti.create(canvas.current, { resize: true, useWorker: true, disableForReducedMotion: true })
      runner.current = render
      played.current = sessionId
      const particleCount = mode === 'low' ? 24 : mode === 'medium' ? 50 : 90
      const options = { particleCount, spread: 76, startVelocity: 30, gravity: .7, ticks: 190,
        scalar: .8, colors: [brand.colors.blue, brand.colors.white, brand.colors.gray], disableForReducedMotion: true }
      void render({ ...options, angle: 58, origin: { x: .12, y: .57 } })
      void render({ ...options, angle: 122, origin: { x: .88, y: .57 } })
      canvas.current.dataset.burst = 'played'
    }).catch(() => { /* Decoration is optional and never blocks completion. */ })
    return () => { cancelled = true }
  }, [phase, sessionId, cinematicSession, paused, reduced, mode])
  return <canvas ref={canvas} className="confetti-layer" aria-hidden="true" />
}
