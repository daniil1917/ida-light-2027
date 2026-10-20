import { Howl, Howler } from 'howler'
import { publicAsset } from '../app/publicAsset'

/** One effects player, created within a real user gesture; no background audio. */
export class AudioManager {
  private effects: Howl | null = null
  private enabled = true
  private active = false
  private unlocked = false

  userGesture() {
    this.unlocked = true
    if (!this.effects) this.effects = new Howl({ src: [publicAsset('audio/impact.wav')], volume: 0.5, pool: 4 })
    if (Howler.ctx?.state === 'suspended') void Howler.ctx.resume().catch(() => {})
    this.sync()
  }

  configure(enabled: boolean, active: boolean) {
    this.enabled = enabled
    this.active = active
    this.sync()
  }

  play() {
    // Never queue feedback that could sound seconds after its visual event.
    if (this.unlocked && this.enabled && this.active && this.effects?.state() === 'loaded') this.effects.play()
  }

  private sync() {
    if (!this.enabled || !this.active) {
      this.effects?.stop()
      return
    }
  }
}

export const audioManager = new AudioManager()
