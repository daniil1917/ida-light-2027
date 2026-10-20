import { useEffect } from 'react'
import { useGameStore } from '../game/store'
import { hapticFeedback } from '../telegram/haptics'
import { audioManager } from './AudioManager'

export function AudioProvider() {
  useEffect(() => {
    const sync = () => {
      const game = useGameStore.getState()
      audioManager.configure(game.soundEnabled, !game.paused && ['tutorial', 'playing', 'celebration', 'greeting'].includes(game.state))
    }
    sync()
    const unsubscribe = useGameStore.subscribe((game, previous) => {
      sync()
      if (game.paused) return
      if (game.feedback && game.feedback !== previous.feedback) {
        const result = game.feedback.result
        if (result === 'success' || result === 'perfect') audioManager.play()
        void hapticFeedback(result, game.sessionId)
      }
    })
    return () => { unsubscribe(); audioManager.configure(false, false) }
  }, [])
  return null
}
