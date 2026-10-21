import { create } from 'zustand'
import { classifyLanding } from './collision'
import { GAME_CONFIG } from './gameConfig'
import { useDevSettings } from './devSettings'
import { readPreference, writePreference } from './storage'
import { getDifficulty } from './difficulty'
import { selectGreeting } from './greetings'
import { findTowerCollapse, type TowerCollapse } from './stability'
import type { Feedback, FloorPhase, GameState, PerformanceMode, PlacedFloor, TelegramUser } from './types'

interface GameStore {
  state: GameState
  phase: FloorPhase
  floors: PlacedFloor[]
  collapse: TowerCollapse | null
  currentFloor: number
  targetFloors: number
  mistakes: number
  perfectCount: number
  consecutivePerfects: number
  difficultyLevel: number
  soundEnabled: boolean
  hasSeenTutorial: boolean
  greetingId: string | null
  telegramUser: TelegramUser | null
  performanceMode: PerformanceMode
  telegramStatus: 'browser' | 'connected' | 'unavailable'
  sessionId: number
  attemptId: number
  swingStartedAt: number
  spawnSide: 1 | -1
  releaseX: number
  retryCount: number
  feedback: Feedback | null
  paused: boolean
  userPaused: boolean
  backgroundPaused: boolean
  pausedAt: number | null
  error: string | null
  ready: () => void
  start: () => void
  goToIntro: () => void
  release: (x: number) => void
  land: (attemptId: number, x: number) => void
  nextFloor: (attemptId: number) => void
  openGreeting: (sessionId: number) => void
  setPaused: (paused: boolean) => void
  setBackgroundPaused: (paused: boolean) => void
  reportError: (error: string) => void
  toggleSound: () => void
}

const initialRun = {
  floors: [] as PlacedFloor[], currentFloor: 0, mistakes: 0, perfectCount: 0,
  consecutivePerfects: 0, difficultyLevel: 1, releaseX: 0, retryCount: 0,
  feedback: null, collapse: null as TowerCollapse | null, phase: 'swinging' as FloorPhase,
  paused: false, userPaused: false, pausedAt: null,
  spawnSide: 1 as 1 | -1,
  greetingId: null as string | null,
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialRun,
  state: 'loading', targetFloors: GAME_CONFIG.targetFloors, soundEnabled: readPreference('sound') !== 'off',
  hasSeenTutorial: readPreference('tutorial') === 'seen',
  telegramUser: null, performanceMode: 'high', telegramStatus: 'browser', backgroundPaused: false,
  sessionId: 0, attemptId: 0, swingStartedAt: performance.now(), error: null,
  ready: () => { if (get().state === 'loading') set({ state: 'intro' }) },
  start: () => {
    const previous = get()
    const fromIntro = previous.state === 'intro'
    const now = performance.now()
    set({ ...initialRun, state: previous.hasSeenTutorial ? 'playing' : 'tutorial',
      spawnSide: fromIntro ? previous.spawnSide : previous.sessionId > 0 ? (previous.spawnSide === 1 ? -1 : 1) : 1,
      sessionId: previous.sessionId + 1, attemptId: previous.attemptId + 1,
      paused: previous.backgroundPaused, pausedAt: previous.backgroundPaused ? now : null,
      swingStartedAt: fromIntro ? previous.swingStartedAt + (previous.pausedAt === null ? 0 : now - previous.pausedAt) : now, error: null })
  },
  goToIntro: () => set({ ...initialRun, state: 'intro', sessionId: get().sessionId + 1,
    attemptId: get().attemptId + 1, swingStartedAt: performance.now(),
    paused: get().backgroundPaused, pausedAt: get().backgroundPaused ? performance.now() : null }),
  release: (x) => {
    const current = get()
    if (!['tutorial', 'playing'].includes(current.state) || current.phase !== 'swinging' || current.paused || !Number.isFinite(x)) return
    writePreference('tutorial', 'seen')
    set({ state: 'playing', phase: 'falling', releaseX: x,
      hasSeenTutorial: true, feedback: null })
  },
  land: (attemptId, x) => {
    const current = get()
    if (attemptId !== current.attemptId || current.phase !== 'falling' || current.state !== 'playing') return
    const supportX = current.floors.at(-1)?.x ?? 0
    const settings = useDevSettings.getState()
    const rules = import.meta.env.DEV ? { perfectOverlap: settings.perfectTolerance,
      successOverlap: settings.successTolerance } : GAME_CONFIG
    const result = classifyLanding(x, supportX, rules)
    const feedback = { result, attemptId, createdAt: performance.now() }
    if (result === 'fail') {
      set({ phase: 'fail', feedback, mistakes: current.mistakes + 1, consecutivePerfects: 0, retryCount: current.retryCount + 1 })
      return
    }
    const floor = { id: attemptId, x,
      y: GAME_CONFIG.baseHeight + (current.currentFloor + 0.5) * GAME_CONFIG.floorHeight,
      perfect: result === 'perfect' }
    const count = current.currentFloor + 1
    const floors = [...current.floors, floor]
    const collapse = findTowerCollapse(floors)
    if (collapse) {
      set({ floors, currentFloor: count, collapse, phase: 'collapse',
        feedback: { ...feedback, result: 'fail' }, consecutivePerfects: 0 })
      return
    }
    const finished = count === GAME_CONFIG.targetFloors
    set({ floors, currentFloor: count, phase: result, feedback,
      retryCount: 0, difficultyLevel: getDifficulty(Math.min(count + 1, GAME_CONFIG.targetFloors)).level,
      perfectCount: current.perfectCount + Number(result === 'perfect'),
      consecutivePerfects: result === 'perfect' ? current.consecutivePerfects + 1 : 0,
      state: finished ? 'celebration' : 'playing',
      ...(finished ? { greetingId: selectGreeting().id } : {}) })
  },
  nextFloor: (attemptId) => {
    const current = get()
    if (current.attemptId !== attemptId || current.state !== 'playing' || current.paused || current.phase === 'falling' || current.phase === 'swinging') return
    if (current.phase === 'collapse' || current.mistakes >= GAME_CONFIG.maxLives) { get().start(); return }
    set({ phase: 'swinging', attemptId: current.attemptId + 1, swingStartedAt: performance.now(), feedback: null,
      spawnSide: current.spawnSide === 1 ? -1 : 1 })
  },
  openGreeting: (sessionId) => {
    const current = get()
    if (current.state !== 'celebration' || current.currentFloor !== GAME_CONFIG.targetFloors || current.paused || current.sessionId !== sessionId || !current.greetingId) return
    set({ state: 'greeting' })
  },
  setPaused: (paused) => {
    const current = get()
    const effective = paused || current.backgroundPaused
    if (current.paused === effective) { set({ userPaused: paused }); return }
    const now = performance.now()
    set({ userPaused: paused, paused: effective, pausedAt: effective ? now : null,
      swingStartedAt: !effective && current.pausedAt !== null ? current.swingStartedAt + now - current.pausedAt : current.swingStartedAt })
  },
  setBackgroundPaused: (backgroundPaused) => {
    if (get().backgroundPaused === backgroundPaused) return
    set({ backgroundPaused })
    get().setPaused(get().userPaused)
  },
  reportError: (error) => set({ state: 'error', error }),
  toggleSound: () => {
    const enabled = !get().soundEnabled
    writePreference('sound', enabled ? 'on' : 'off')
    set({ soundEnabled: enabled })
  },
}))
