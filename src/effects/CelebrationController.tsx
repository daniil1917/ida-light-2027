import { isFinalState } from '../game/types'
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useReducedMotion } from 'motion/react'
import { useGameStore } from '../game/store'
import { hapticFeedback } from '../telegram/haptics'
import { celebrationClock as clock, celebrationPhase } from './timeline'
import { useCelebrationStore } from './celebrationStore'
import { CELEBRATION as C } from './celebrationConfig'
import { useDevSettings } from '../game/devSettings'
import { findGreeting } from '../game/greetings'

export function CelebrationController() {
  const complete = useGameStore(s => isFinalState(s.state))
  const sessionId = useGameStore(s => s.sessionId)
  const staticFinal = useDevSettings(s => s.staticFinal)
  const reduced = !!useReducedMotion() || (import.meta.env.DEV && staticFinal)
  const completed = useRef<number | null>(null)
  useEffect(() => {
    if (complete) {
      // Decode the selected variant during the house finale, before its reveal.
      const selected = findGreeting(useGameStore.getState().greetingId)
      if (selected) {
        const postcard = new Image()
        postcard.src = selected.artwork
        void postcard.decode().catch(() => {})
      }
      if (clock.sessionId !== sessionId) completed.current = null
      clock.begin(sessionId, reduced)
      useCelebrationStore.setState({ sessionId, phase: celebrationPhase(clock.elapsed, reduced), reduced })
    } else {
      clock.reset(); completed.current = null
      useCelebrationStore.setState({ sessionId: null, phase: 'idle', reduced })
    }
  }, [complete, sessionId, reduced])
  useEffect(() => () => { clock.reset(); useCelebrationStore.setState({ sessionId: null, phase: 'idle' }) }, [])
  useFrame((_, delta) => {
    const game = useGameStore.getState()
    if (!isFinalState(game.state) || clock.sessionId !== game.sessionId) return
    clock.advance(delta, game.paused)
    const phase = celebrationPhase(clock.elapsed, clock.reduced)
    if (phase !== useCelebrationStore.getState().phase) useCelebrationStore.setState({ phase })
    if (game.paused) return
    if (clock.elapsed >= (clock.reduced ? C.reducedComplete : C.year) && completed.current !== game.sessionId) {
      completed.current = game.sessionId
      void hapticFeedback('complete', game.sessionId)
    }
    if (phase === 'ready' && game.state === 'celebration') game.openGreeting(game.sessionId)
  }, -20)
  return null
}
