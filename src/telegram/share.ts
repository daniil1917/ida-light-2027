import { GAME_CONFIG } from '../game/gameConfig'
import type { Greeting } from '../game/greetings'
import { useGameStore } from '../game/store'

export interface GreetingShare { title: string; text: string; url?: string }
export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'manual'

/** Never leak launch data, user IDs or a local development address into a share. */
export function publicShareURL(configured: string, pageURL: string): string | undefined {
  try {
    const url = new URL(configured.trim() || pageURL)
    const hostname = url.hostname.toLowerCase()
    if (url.protocol !== 'https:' || url.username || url.password || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname === '[::1]' || /^(127\.|10\.|192\.168\.|0\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)) return
    if (!configured.trim()) { url.search = ''; url.hash = '' }
    return url.href
  } catch { return }
}

export function buildGreetingShare(greeting: Greeting, url?: string): GreetingShare {
  return { title: 'Построй 2027 · Ида Лайт',
    text: `Дом из ${GAME_CONFIG.targetFloors} этажей готов! Моё пожелание на 2027 год:\n\n${greeting.text}\n\nС Новым годом! Ида Лайт.`, ...(url ? { url } : {}) }
}
export const shareText = (payload: GreetingShare) => `${payload.text}${payload.url ? `\n\n${payload.url}` : ''}`

export async function copyGreeting(payload: GreetingShare): Promise<ShareResult> {
  try { await navigator.clipboard.writeText(shareText(payload)); return 'copied' } catch { return 'manual' }
}

/** Called by an explicit button only. Telegram opens its recipient chooser. */
export async function shareGreeting(payload: GreetingShare): Promise<ShareResult> {
  if (payload.url && useGameStore.getState().telegramStatus === 'connected') {
    try {
      const sdk = await import('@tma.js/sdk')
      const result = sdk.shareURL.ifAvailable(payload.url, payload.text)
      if (result.ok) return 'shared'
    } catch { /* Continue to browser/manual fallback. */ }
  }
  if (payload.url && navigator.share) {
    try { await navigator.share(payload); return 'shared' }
    catch (error) { if (error instanceof Error && error.name === 'AbortError') return 'cancelled' }
  }
  return copyGreeting(payload)
}
