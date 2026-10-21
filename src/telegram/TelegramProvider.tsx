import { useEffect } from 'react'
import { connectTelegram } from './telegram'
import { useGameStore } from '../game/store'

export function TelegramProvider() {
  useEffect(() => {
    let alive = true
    let stop: (() => void) | undefined
    void connectTelegram().then(connection => {
      if (alive && connection) stop = connection.subscribe()
    }).catch(() => { if (alive) useGameStore.setState({ telegramStatus: 'unavailable' }) })
    const visibility = () => {
      // Telegram also reports host activity; its subscription owns that state.
      if (document.hidden || useGameStore.getState().telegramStatus !== 'connected')
        useGameStore.getState().setBackgroundPaused(document.hidden)
    }
    document.addEventListener('visibilitychange', visibility)
    visibility()
    return () => { alive = false; stop?.(); document.removeEventListener('visibilitychange', visibility) }
  }, [])
  return null
}
