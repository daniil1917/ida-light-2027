import { Component, lazy, Suspense, useEffect, type ReactNode } from 'react'
import { AnimatePresence, MotionConfig } from 'motion/react'
import { TelegramProvider } from '../telegram/TelegramProvider'
import { useGameStore } from '../game/store'
import { swingPosition } from '../game/swing'
import { GAME_CONFIG } from '../game/gameConfig'
import { detectPerformanceMode } from './performanceConfig'
import { IntroScreen } from '../ui/IntroScreen'
import { GameHUD } from '../ui/GameHUD'
import { LoadingScreen } from '../ui/ida/LoadingScreen'
import { ErrorScreen } from '../ui/ida/ErrorScreen'
import { UnsupportedDevice } from '../ui/ida/UnsupportedDevice'
import { SoundToggle } from '../ui/ida/SoundToggle'
import { PauseToggle } from '../ui/ida/PauseToggle'
import { AudioProvider } from '../audio/AudioProvider'
import { audioManager } from '../audio/AudioManager'
import { useCelebrationStore } from '../effects/celebrationStore'
import { ConfettiLayer } from '../effects/ConfettiLayer'
import { isFinalState } from '../game/types'
import { collapseDurationMs } from '../game/stability'
import { publicAsset } from './publicAsset'

const GameCanvas = lazy(() => import('../scene/GameCanvas'))
const GreetingCard = lazy(() => import('../ui/ida/GreetingCard'))
const DebugPanel = import.meta.env.DEV ? lazy(() => import('../ui/DebugPanel')) : null

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch { return false }
}
const webGLSupported = supportsWebGL()

class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error) {
    console.error('Ida game failed:', error)
    useGameStore.getState().reportError(import.meta.env.DEV ? `Ошибка сцены: ${error.message}` : 'Не удалось загрузить игру. Проверь соединение и открой её снова.')
  }
  render() { return this.state.failed ? null : this.props.children }
}

function GameLifecycle() {
  const phase = useGameStore(s => s.phase)
  const state = useGameStore(s => s.state)
  const attemptId = useGameStore(s => s.attemptId)
  const paused = useGameStore(s => s.paused)
  const mistakes = useGameStore(s => s.mistakes)
  const collapse = useGameStore(s => s.collapse)
  const floors = useGameStore(s => s.floors)
  useEffect(() => {
    if (state !== 'playing' || paused || !['fail', 'success', 'perfect', 'collapse'].includes(phase)) return
    const timer = window.setTimeout(() => useGameStore.getState().nextFloor(attemptId),
      phase === 'collapse' && collapse ? collapseDurationMs(floors, collapse) : phase === 'fail' ? mistakes >= GAME_CONFIG.maxLives ? GAME_CONFIG.restartDelayMs : GAME_CONFIG.retryDelayMs : GAME_CONFIG.successDelayMs)
    return () => window.clearTimeout(timer)
  }, [phase, state, attemptId, paused, mistakes, floors, collapse])
  useEffect(() => { useGameStore.setState({ performanceMode: detectPerformanceMode() }) }, [])
  return null
}

export default function App() {
  const state = useGameStore(s => s.state)
  const error = useGameStore(s => s.error)
  const sessionId = useGameStore(s => s.sessionId)
  const cinematic = useCelebrationStore()
  const playing = state === 'playing' || state === 'tutorial'
  const drop = () => { audioManager.userGesture(); useGameStore.getState().release(swingPosition()) }
  return <MotionConfig reducedMotion="user"><TelegramProvider /><GameLifecycle /><AudioProvider />
    <main className="game-shell" aria-label="Построй 2027" data-state={state}>
      <div className="winter-backdrop" aria-hidden="true" />
      <div className="scene-area" role={playing ? 'button' : undefined} tabIndex={playing ? 0 : -1}
        aria-label={playing ? 'Установить этаж' : 'Архитектурная 3D-сцена'}
        onPointerDown={playing ? event => { if (event.button === 0) drop() } : undefined}
        onClick={playing ? event => { if (event.detail === 0) drop() } : undefined}
        onKeyDown={e => { if (playing && !e.repeat && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); drop() } }}>
        {webGLSupported && state !== 'error' && <SceneErrorBoundary><Suspense fallback={null}><GameCanvas /></Suspense></SceneErrorBoundary>}
      </div>
      <header className="brand-header" inert={state === 'loading' || state === 'error' || !webGLSupported}><img className="brand-logo" src={publicAsset('branding/ida-logo.svg')} alt="Ида Лайт" width="132" height="21" />
        <div className="header-actions"><span className="brand-year">2027</span><PauseToggle /><SoundToggle /></div></header>
      {!webGLSupported ? <UnsupportedDevice /> : <AnimatePresence initial={false} mode="sync">
        {state === 'loading' && <LoadingScreen key="loading" />}
        {state === 'intro' && <IntroScreen key="intro" />}
        {playing && <GameHUD key="game" />}
        {state === 'greeting' && <SceneErrorBoundary key="greeting"><Suspense fallback={<p className="sr-only" role="status">Готовим пожелание…</p>}><GreetingCard /></Suspense></SceneErrorBoundary>}
        {state === 'error' && <ErrorScreen key="error" message={error ?? 'Открой игру снова.'} />}
      </AnimatePresence>}
      {isFinalState(state) && !cinematic.reduced && <ConfettiLayer key={sessionId} />}
      {DebugPanel && new URLSearchParams(location.search).has('debug') && <Suspense fallback={null}><DebugPanel /></Suspense>}
    </main>
  </MotionConfig>
}
