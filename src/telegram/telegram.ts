import { useGameStore } from '../game/store'
import { VISUAL_CONFIG } from '../app/visualConfig'

export interface TelegramConnection { subscribe: () => () => void }
let connection: Promise<TelegramConnection | null> | undefined

/** SDK singletons live for the app lifetime, never remount on replay. */
export function connectTelegram(): Promise<TelegramConnection | null> {
  connection ??= initialize()
  return connection
}

async function initialize(): Promise<TelegramConnection | null> {
  const sdk = await import('@tma.js/sdk')
  if (!sdk.isTMA()) return null
  try {
    sdk.init()
    sdk.themeParams.mount.ifAvailable()
    sdk.miniApp.mount.ifAvailable()
    sdk.initData.restore()
    if (!sdk.themeParams.isCssVarsBound()) sdk.themeParams.bindCssVars.ifAvailable()
    sdk.miniApp.setBgColor.ifAvailable(VISUAL_CONFIG.background)
    sdk.miniApp.setHeaderColor.ifAvailable(VISUAL_CONFIG.background)
    sdk.miniApp.setBottomBarColor.ifAvailable(VISUAL_CONFIG.background)
    sdk.miniApp.ready.ifAvailable()
    sdk.backButton.mount.ifAvailable()
    sdk.swipeBehavior.mount.ifAvailable()
    const user = sdk.initData.user()
    useGameStore.setState({ telegramStatus: 'connected', telegramUser: user ? {
      id: user.id, firstName: user.first_name, lastName: user.last_name,
    } : null })
    // An old client or viewport timeout uses the browser's dvh/env fallback.
    try {
      if (sdk.viewport.mount.isAvailable() && !sdk.viewport.isMounted()) await sdk.viewport.mount({ timeout: 1800 })
      sdk.viewport.expand.ifAvailable()
      if (!sdk.viewport.isCssVarsBound()) sdk.viewport.bindCssVars.ifAvailable()
    } catch { /* Non-fatal: CSS already has dvh and safe-area fallbacks. */ }
    return {
      subscribe: () => {
        const updateBack = () => {
          const state = useGameStore.getState().state
          if (['playing', 'tutorial', 'celebration', 'greeting'].includes(state)) sdk.backButton.show.ifAvailable()
          else sdk.backButton.hide.ifAvailable()
          if (['playing', 'tutorial', 'celebration'].includes(state)) sdk.swipeBehavior.disableVertical.ifAvailable()
          else sdk.swipeBehavior.enableVertical.ifAvailable()
        }
        const updateActivity = () => useGameStore.getState().setBackgroundPaused(document.hidden || !sdk.miniApp.isActive())
        const back = sdk.backButton.onClick.ifAvailable(() => useGameStore.getState().goToIntro())
        const stopStore = useGameStore.subscribe((current, previous) => { if (current.state !== previous.state) updateBack() })
        const stopActivity = sdk.miniApp.isActive.sub(updateActivity)
        document.addEventListener('visibilitychange', updateActivity)
        updateBack()
        updateActivity()
        return () => { stopStore(); stopActivity(); document.removeEventListener('visibilitychange', updateActivity); if (back.ok) back.data(); sdk.swipeBehavior.enableVertical.ifAvailable() }
      },
    }
  } catch {
    useGameStore.setState({ telegramStatus: 'unavailable' })
    return null
  }
}
