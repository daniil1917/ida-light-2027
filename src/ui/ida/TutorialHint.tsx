import { Badge } from '../fluid/badge'
import { useGameStore } from '../../game/store'
export function TutorialHint() {
  const tutorial = useGameStore(s => s.state === 'tutorial')
  if (!tutorial) return null
  return <div className="tutorial-hint"><Badge>Нажми, чтобы сбросить этаж</Badge>
    <small>Ставь этажи ближе к центру.<br />Если баланс упадёт до 0%, дом рухнет.</small>
  </div>
}
