import { useMemo } from 'react'
import { Badge } from '../fluid/badge'
import { useGameStore } from '../../game/store'
import { getTowerBalance } from '../../game/stability'

export function TowerBalance() {
  const floors = useGameStore(s => s.floors)
  const { percent, direction, collapse } = useMemo(() => getTowerBalance(floors), [floors])
  const balance = 100 - percent
  const hint = collapse ? 'Дом падает' : percent >= 55
    ? direction > 0 ? 'Следующий этаж левее' : 'Следующий этаж правее'
    : 'Дом устойчив'
  return <div className="tower-balance">
    <Badge color={percent >= 75 ? 'blue' : 'gray'} role="meter" aria-label="Баланс дома"
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={balance}
      aria-valuetext={`${balance}% · ${hint}. При 0% дом упадёт`} title="Чем ниже баланс, тем ближе падение. При 0% дом упадёт.">
      Баланс · <strong>{balance}%</strong>{percent >= 55 && !collapse && <span aria-hidden="true"> {direction > 0 ? '←' : '→'}</span>}
    </Badge>
    <span className="sr-only" role="status" aria-live="polite">{hint}</span>
  </div>
}
