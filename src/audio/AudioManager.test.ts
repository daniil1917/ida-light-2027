import { beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ players: [] as Array<{ play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; state: ReturnType<typeof vi.fn>; playing: ReturnType<typeof vi.fn> }>, resume: vi.fn().mockResolvedValue(undefined) }))
vi.mock('howler', () => ({
  Howler: { ctx: { state: 'suspended', resume: mock.resume } },
  Howl: class {
    play = vi.fn()
    pause = vi.fn()
    stop = vi.fn()
    state = vi.fn().mockReturnValue('loaded')
    playing = vi.fn().mockReturnValue(false)
    constructor() { mock.players.push(this) }
  },
}))
import { AudioManager } from './AudioManager'
beforeEach(() => { mock.players.length = 0; vi.clearAllMocks() })

describe('audio lifecycle', () => {
  it('allocates no audio and plays nothing before a user gesture', () => {
    const audio = new AudioManager()
    audio.configure(true, true)
    audio.play()
    expect(mock.players).toHaveLength(0)
  })
  it('reuses one effects player across replay and never creates background audio', () => {
    const audio = new AudioManager()
    for (let i = 0; i < 20; i++) {
      audio.userGesture()
      audio.configure(true, true)
      audio.play()
      audio.configure(true, false)
    }
    expect(mock.players).toHaveLength(1)
  })
  it('mutes feedback when sound is off', () => {
    const audio = new AudioManager()
    audio.userGesture()
    audio.configure(false, true)
    audio.play()
    expect(mock.players[0].play).not.toHaveBeenCalled()
    expect(mock.players[0].stop).toHaveBeenCalled()
  })
  it('never queues effects while assets are loading', () => {
    const audio = new AudioManager()
    audio.userGesture()
    audio.configure(true, true)
    mock.players[0].state.mockReturnValue('loading')
    audio.play()
    expect(mock.players[0].play).not.toHaveBeenCalled()
  })
  it('stops effects while paused and resumes only on the next game event', () => {
    const audio = new AudioManager()
    audio.userGesture()
    audio.configure(true, true)
    audio.play()
    expect(mock.players[0].play).toHaveBeenCalledTimes(1)
    audio.configure(true, false)
    audio.play()
    expect(mock.players[0].stop).toHaveBeenCalled()
    expect(mock.players[0].play).toHaveBeenCalledTimes(1)
    audio.configure(true, true)
    expect(mock.players[0].play).toHaveBeenCalledTimes(1)
    audio.play()
    expect(mock.players[0].play).toHaveBeenCalledTimes(2)
  })
})
