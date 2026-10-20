import { useGameStore } from '../game/store'
import type { LandingResult } from '../game/types'

export async function hapticFeedback(result: LandingResult | 'complete', sessionId: number) {
  if (useGameStore.getState().telegramStatus !== 'connected') return
  try {
    const sdk = await import('@tma.js/sdk')
    const state = useGameStore.getState()
    if (state.sessionId !== sessionId || state.paused) return
    if (result === 'complete') sdk.hapticFeedback.notificationOccurred.ifAvailable('success')
    else sdk.hapticFeedback.impactOccurred.ifAvailable(result === 'perfect' ? 'light' : 'soft')
  } catch { /* Haptics are optional on older Telegram clients. */ }
}
