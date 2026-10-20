import { useGameStore } from '../../game/store'
export function FloorCounter() {
  const current = useGameStore(s => s.currentFloor)
  const target = useGameStore(s => s.targetFloors)
  return <div className="floor-counter" aria-label={`${current} из ${target} этажей`}>
    <span className="floor-number">{String(current).padStart(2, '0')}</span>
    <span className="floor-total">/ {target}</span>
  </div>
}
