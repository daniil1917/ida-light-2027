import { useIcon } from '../fluid/icon-context'
import { Button } from '../fluid/button'
import { useGameStore } from '../../game/store'
import { audioManager } from '../../audio/AudioManager'

export function SoundToggle() {
  const enabled = useGameStore(s => s.soundEnabled)
  const Icon = useIcon(enabled ? 'volume-2' : 'volume-x')
  return <Button size="icon" className="h-11 w-11 [&_svg]:h-5 [&_svg]:w-5" type="button" aria-label={enabled ? 'Выключить звук' : 'Включить звук'} aria-pressed={enabled}
    onClick={() => { audioManager.userGesture(); useGameStore.getState().toggleSound() }}>
    <Icon />
  </Button>
}
