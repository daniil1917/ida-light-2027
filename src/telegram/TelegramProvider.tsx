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
      if (document.hidden) useGameStore.getState().setPaused(true)
      else void import('@tma.js/sdk').then(sdk => {
        useGameStore.getState().setPaused(useGameStore.getState().telegramStatus === 'connected' && !sdk.miniApp.isActive())
      })
    }
    document.addEventListener('visibilitychange', visibility)
    return () => { alive = false; stop?.(); document.removeEventListener('visibilitychange', visibility) }
  }, [])
  return null
}
