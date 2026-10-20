import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameStore as store } from './store'
import { useDevSettings } from './devSettings'
import { GAME_CONFIG } from './gameConfig'
import { swingPosition } from './swing'

beforeEach(() => {
  store.setState(store.getInitialState(), true)
  useDevSettings.setState(useDevSettings.getInitialState(), true)
  store.getState().ready()
  store.getState().start()
})

function dropAt(x: number) {
  store.getState().release(x)
  store.getState().land(store.getState().attemptId, x)
}

describe('game session invariants', () => {
  it.each([false, true])('preserves the visible suspended floor when entering from the intro (paused %s)', paused => {
    store.getState().goToIntro()
    store.setState({ swingStartedAt: 1000, spawnSide: -1, paused, pausedAt: paused ? 2000 : null })
    const now = vi.spyOn(performance, 'now').mockReturnValue(5000)
    try {
      const before = swingPosition()
      store.getState().start()
      expect(swingPosition()).toBeCloseTo(before, 8)
      expect(store.getState().spawnSide).toBe(-1)
      expect(store.getState().paused).toBe(false)
    } finally { now.mockRestore() }
  })
  it.each([null, { id: 123456, firstName: 'Игрок' }])('draws once at victory and changes on replay for user %s', user => {
    store.setState({ telegramUser: user })
    const sessionId = store.getState().sessionId
    store.getState().openGreeting(sessionId)
    expect(store.getState().greetingId).toBeNull()
    for (let i = 0; i < GAME_CONFIG.targetFloors; i++) { dropAt(0); store.getState().nextFloor(store.getState().attemptId) }
    const preparedGreeting = store.getState().greetingId
    expect(preparedGreeting).not.toBeNull()
    store.getState().openGreeting(sessionId - 1)
    expect(store.getState().state).toBe('celebration')
    store.getState().setPaused(true)
    store.getState().openGreeting(sessionId)
    expect(store.getState().state).toBe('celebration')
    store.getState().setPaused(false)
    store.getState().openGreeting(sessionId)
    expect(store.getState().state).toBe('greeting')
    const greeting = store.getState().greetingId
    expect(greeting).toBe(preparedGreeting)
    store.getState().openGreeting(sessionId)
    expect(store.getState().greetingId).toBe(greeting)
    store.getState().release(0)
    expect(store.getState().currentFloor).toBe(GAME_CONFIG.targetFloors)
    store.getState().start()
    expect(store.getState().greetingId).toBeNull()
    for (let i = 0; i < GAME_CONFIG.targetFloors; i++) { dropAt(0); store.getState().nextFloor(store.getState().attemptId) }
    store.getState().openGreeting(store.getState().sessionId)
    expect(store.getState().greetingId).not.toBeNull()
    expect(store.getState().greetingId).not.toBe(greeting)
  })
  it('first tap removes tutorial and begins a physical drop', () => {
    expect(store.getState().state).toBe('tutorial')
    store.getState().release(0.1)
    expect(store.getState().state).toBe('playing')
    expect(store.getState().phase).toBe('falling')
    expect(store.getState().hasSeenTutorial).toBe(true)
    expect(store.getState().currentFloor).toBe(0)
  })
  it('ignores duplicate taps during the same drop', () => {
    store.getState().release(0.1)
    store.getState().release(2)
    expect(store.getState().releaseX).toBe(0.1)
    expect(store.getState().currentFloor).toBe(0)
  })
  it('retains the exact coordinate of a perfect hit and updates statistics', () => {
    dropAt(0.15)
    expect(store.getState().floors[0].x).toBe(0.15)
    expect(store.getState().perfectCount).toBe(1)
    expect(store.getState().consecutivePerfects).toBe(1)
  })
  it('preserves the offset of a normal success', () => {
    dropAt(0.9)
    expect(store.getState().floors[0].x).toBe(0.9)
    expect(store.getState().phase).toBe('success')
  })
  it.each([-1, 1])('preserves natural offsets in a balanced fifteen-floor tower (direction %s)', direction => {
    for (let floor = 0; floor < GAME_CONFIG.targetFloors; floor++) {
      const support = store.getState().floors.at(-1)?.x ?? 0
      const release = support + direction * (floor % 2 ? -.9 : .9)
      store.getState().release(release)
      expect(store.getState().releaseX).toBe(release)
      store.getState().land(store.getState().attemptId, release)
      expect(store.getState().floors.at(-1)!.x).toBe(release)
      expect(store.getState().currentFloor).toBe(floor + 1)
      store.getState().nextFloor(store.getState().attemptId)
    }
    expect(store.getState().state).toBe('celebration')
    expect(store.getState().floors[0].x).toBe(direction * .9)
    expect(store.getState().mistakes).toBe(0)
  })
  it.each([-1, 1])('ends an overbalanced round, blocks extra drops and respects pause (%s)', direction => {
    for (const x of [.9, 1.8, 2.7, 3.6]) { dropAt(x * direction * GAME_CONFIG.floorWidth / 3); store.getState().nextFloor(store.getState().attemptId) }
    dropAt(4.5 * direction * GAME_CONFIG.floorWidth / 3)
    const attempt = store.getState().attemptId, session = store.getState().sessionId
    expect(store.getState().phase).toBe('collapse')
    expect(store.getState().collapse?.direction).toBe(direction)
    expect(store.getState().floors.at(-1)!.x).toBe(4.5 * direction * GAME_CONFIG.floorWidth / 3)
    expect(store.getState().feedback?.result).toBe('fail')
    expect(store.getState().mistakes).toBe(0)
    store.getState().release(0); store.getState().land(attempt, 0)
    expect(store.getState().currentFloor).toBe(5)
    store.getState().setPaused(true); store.getState().nextFloor(attempt)
    expect(store.getState().sessionId).toBe(session)
    store.getState().setPaused(false); store.getState().nextFloor(attempt)
    expect(store.getState().sessionId).toBe(session + 1)
    expect(store.getState().collapse).toBeNull()
    expect(store.getState().floors).toEqual([])
    expect(store.getState().mistakes).toBe(0)
    store.getState().nextFloor(attempt); store.getState().land(attempt, 0)
    expect(store.getState().currentFloor).toBe(0)
  })
  it('checks the fifteenth floor for balance before celebrating', () => {
    for (let i = 0; i < GAME_CONFIG.targetFloors - 4; i++) { dropAt(0); store.getState().nextFloor(store.getState().attemptId) }
    for (const x of [.9, 1.8, 2.7]) { dropAt(x * GAME_CONFIG.floorWidth / 3); store.getState().nextFloor(store.getState().attemptId) }
    expect(store.getState().phase).toBe('swinging')
    dropAt(3.6 * GAME_CONFIG.floorWidth / 3)
    expect(store.getState().currentFloor).toBe(GAME_CONFIG.targetFloors)
    expect(store.getState().phase).toBe('collapse')
    expect(store.getState().state).toBe('playing')
    store.getState().openGreeting(store.getState().sessionId)
    expect(store.getState().greetingId).toBeNull()
  })
  it('alternates the starting side after both success and a retry', () => {
    expect(swingPosition(store.getState().swingStartedAt)).toBeGreaterThan(0)
    dropAt(0); store.getState().nextFloor(store.getState().attemptId)
    expect(swingPosition(store.getState().swingStartedAt)).toBeLessThan(0)
    dropAt(3); store.getState().nextFloor(store.getState().attemptId)
    expect(swingPosition(store.getState().swingStartedAt)).toBeGreaterThan(0)
  })
  it('keeps manual QA amplitude inside the crane travel budget', () => {
    useDevSettings.setState({ overrideDifficulty: true, amplitude: 3.5 })
    expect(swingPosition(store.getState().swingStartedAt)).toBeCloseTo(GAME_CONFIG.maxSwingAmplitude)
    useDevSettings.setState({ amplitude: -1 })
    expect(swingPosition(store.getState().swingStartedAt)).toBe(0)
  })
  it('keeps the entire tower after a miss and retries the same floor', () => {
    dropAt(0)
    store.getState().nextFloor(store.getState().attemptId)
    dropAt(2.5)
    expect(store.getState().currentFloor).toBe(1)
    expect(store.getState().floors).toHaveLength(1)
    expect(store.getState().mistakes).toBe(1)
    store.getState().nextFloor(store.getState().attemptId)
    expect(store.getState().phase).toBe('swinging')
    expect(store.getState().currentFloor).toBe(1)
  })
  it('restarts after the third miss, respecting pause and ignoring stale callbacks', () => {
    dropAt(0); store.getState().nextFloor(store.getState().attemptId)
    const session = store.getState().sessionId
    for (let livesLost = 1; livesLost <= 3; livesLost++) {
      dropAt(3)
      expect(store.getState().mistakes).toBe(livesLost)
      expect(store.getState().currentFloor).toBe(1)
      if (livesLost < 3) store.getState().nextFloor(store.getState().attemptId)
    }
    const attempt = store.getState().attemptId
    store.getState().setPaused(true); store.getState().nextFloor(attempt)
    expect(store.getState().sessionId).toBe(session)
    store.getState().setPaused(false); store.getState().nextFloor(attempt)
    expect(store.getState().sessionId).toBe(session + 1)
    expect(store.getState().mistakes).toBe(0)
    expect(store.getState().currentFloor).toBe(0)
    expect(store.getState().floors).toHaveLength(0)
    expect(store.getState().state).toBe('playing')
    const side = store.getState().spawnSide
    store.getState().nextFloor(attempt); store.getState().land(attempt, 0)
    expect(store.getState().spawnSide).toBe(side)
    expect(store.getState().currentFloor).toBe(0)
  })
  it('ignores duplicate collision events', () => {
    const id = store.getState().attemptId
    dropAt(0)
    store.getState().land(id, 0)
    expect(store.getState().currentFloor).toBe(1)
  })
  it('ignores collisions and timers from a previous game', () => {
    const previousId = store.getState().attemptId
    store.getState().release(0)
    store.getState().start()
    store.getState().release(0)
    store.getState().land(previousId, 0)
    store.getState().nextFloor(previousId)
    expect(store.getState().phase).toBe('falling')
    expect(store.getState().currentFloor).toBe(0)
  })
  it('does not release while paused or in the intro', () => {
    store.getState().setPaused(true)
    store.getState().release(0)
    expect(store.getState().phase).toBe('swinging')
    store.getState().goToIntro()
    store.getState().release(0)
    expect(store.getState().state).toBe('intro')
  })
  it('completes all 15 floors once and blocks further drops and stale timers', () => {
    for (let i = 0; i < GAME_CONFIG.targetFloors - 1; i++) {
      dropAt(0)
      store.getState().nextFloor(store.getState().attemptId)
    }
    expect(store.getState().state).toBe('playing')
    expect(store.getState().currentFloor).toBe(GAME_CONFIG.targetFloors - 1)
    dropAt(0)
    expect(store.getState().state).toBe('celebration')
    expect(store.getState().currentFloor).toBe(GAME_CONFIG.targetFloors)
    expect(store.getState().floors).toHaveLength(GAME_CONFIG.targetFloors)
    expect(store.getState().targetFloors).toBe(GAME_CONFIG.targetFloors)
    store.getState().release(0)
    store.getState().land(store.getState().attemptId, 0)
    store.getState().nextFloor(store.getState().attemptId)
    expect(store.getState().currentFloor).toBe(GAME_CONFIG.targetFloors)
    expect(store.getState().phase).toBe('perfect')
  })
  it('keeps a retry at its actual contact coordinate without help', () => {
    dropAt(3)
    store.getState().nextFloor(store.getState().attemptId)
    store.getState().release(1)
    expect(store.getState().retryCount).toBe(1)
    expect(store.getState().releaseX).toBe(1)
    store.getState().land(store.getState().attemptId, 1)
    expect(store.getState().floors[0].x).toBe(1)
    expect(store.getState().retryCount).toBe(0)
  })
  it('retains sound preference and creates a clean replay', () => {
    const original = store.getState().soundEnabled
    store.getState().toggleSound()
    dropAt(0)
    store.getState().start()
    expect(store.getState().soundEnabled).toBe(!original)
    expect(store.getState().retryCount).toBe(0)
    expect(store.getState().feedback).toBeNull()
    expect(store.getState().difficultyLevel).toBe(1)
  })
  it('replay resets the tower and errors while retaining tutorial preference', () => {
    dropAt(0)
    const sessionId = store.getState().sessionId
    store.getState().start()
    expect(store.getState().sessionId).toBe(sessionId + 1)
    expect(store.getState().floors).toHaveLength(0)
    expect(store.getState().mistakes).toBe(0)
    expect(store.getState().state).toBe('playing')
  })
})
