import { afterEach, expect, test, vi } from 'vitest'
const effects = vi.hoisted(() => ({ cleanups: [] as Array<() => void>, play: vi.fn(), configure: vi.fn() }))
vi.mock('react', () => ({ useEffect: (setup: () => () => void) => effects.cleanups.push(setup()) }))
vi.mock('./AudioManager', () => ({ audioManager: effects }))
vi.mock('../telegram/haptics', () => ({ hapticFeedback: vi.fn() }))
import { AudioProvider } from './AudioProvider'
import { useGameStore as game } from '../game/store'

afterEach(() => { effects.cleanups.splice(0).forEach(cleanup => cleanup()); vi.clearAllMocks() })

test('only a successful physical placement sounds; flight, misses, collapse and finale remain quiet', () => {
  game.setState(game.getInitialState(), true)
  AudioProvider()
  game.getState().ready(); game.getState().start()
  expect(effects.play).not.toHaveBeenCalled()
  game.getState().release(0)
  expect(effects.play).not.toHaveBeenCalled()
  const attempt = game.getState().attemptId
  game.getState().land(attempt, 0)
  expect(effects.play).toHaveBeenCalledTimes(1)
  game.getState().land(attempt, 0)
  expect(effects.play).toHaveBeenCalledTimes(1)
  game.getState().nextFloor(attempt)
  game.getState().release(3); game.getState().land(game.getState().attemptId, 3)
  expect(effects.play).toHaveBeenCalledTimes(1)
  game.getState().start()
  for (const x of [1.1, 2.2, 3.3, 4.4]) {
    game.getState().release(x); game.getState().land(game.getState().attemptId, x)
    game.getState().nextFloor(game.getState().attemptId)
  }
  const successful = effects.play.mock.calls.length
  game.getState().release(5.5); game.getState().land(game.getState().attemptId, 5.5)
  expect(game.getState().phase).toBe('collapse')
  expect(effects.play).toHaveBeenCalledTimes(successful)
  game.setState({ state: 'celebration' }); game.setState({ state: 'greeting' })
  expect(effects.play).toHaveBeenCalledTimes(successful)
})
