import { useMemo, useRef, type ReactNode, type RefObject } from 'react'
import { Group } from 'three'
import { useGameStore } from '../../game/store'
import { GAME_CONFIG as G } from '../../game/gameConfig'
import { StaticFloors } from './StaticFloors'
import { CollapsingTower } from '../../physics/CollapsingTower'
export function FloorInstances({ moving }: { moving: (fallingTower: ReactNode, activeFloor: RefObject<Group | null>) => ReactNode }) {
  const activeFloor = useRef<Group>(null)
  const floors = useGameStore(s => s.floors)
  const collapse = useGameStore(s => s.collapse)
  const standing = useMemo(() => [{ id: -1, x: 0, y: G.baseHeight / 2, perfect: false },
    ...(collapse ? floors.slice(0, collapse.fromFloor) : floors)], [floors, collapse])
  const falling = useMemo(() => collapse ? floors.slice(collapse.fromFloor) : [], [floors, collapse])
  return <><StaticFloors floors={standing} firstFloor={0} activeFloor={activeFloor} />
    {moving(collapse && <CollapsingTower collapse={collapse} floors={falling}>
      <StaticFloors floors={falling} firstFloor={collapse.fromFloor + 1} />
    </CollapsingTower>, activeFloor)}
  </>
}
