import { GAME_CONFIG } from './gameConfig'
import { useDevSettings } from './devSettings'
import { useGameStore } from './store'
import { getDifficulty } from './difficulty'

export function swingPosition(now = performance.now()): number {
  const game = useGameStore.getState()
  const settings = useDevSettings.getState()
  const difficulty = getDifficulty(game.currentFloor + 1)
  const manual = import.meta.env.DEV && settings.overrideDifficulty
  const speed = manual ? settings.swingSpeed : difficulty.speed
  const amplitude = Math.min(GAME_CONFIG.maxSwingAmplitude, Math.max(0, manual ? settings.amplitude : difficulty.amplitude))
  const time = ((game.pausedAt ?? now) - game.swingStartedAt) / 1000
  return (game.floors.at(-1)?.x ?? 0) + game.spawnSide * Math.sin(time * speed + GAME_CONFIG.swingPhase) * amplitude
}
