import { useIcon } from '../fluid/icon-context'
import { Button } from '../fluid/button'
import { useGameStore } from '../../game/store'

export function PauseToggle() {
  const paused = useGameStore(s => s.paused)
  const Icon = useIcon(paused ? 'play' : 'pause')
  const label = paused ? 'Продолжить игру' : 'Приостановить игру'
  return <Button type="button" size="icon" className="h-11 w-11 [&_svg]:h-5 [&_svg]:w-5" aria-label={label} title={label} aria-pressed={paused}
    onClick={() => useGameStore.getState().setPaused(!paused)}>
    <Icon />
  </Button>
}
