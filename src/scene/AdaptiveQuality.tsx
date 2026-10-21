import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { QualityGovernor } from '../app/qualityGovernor'
import { useGameStore } from '../game/store'
import { MAX_QUALITY } from '../app/performanceConfig'

export function AdaptiveQuality() {
  const governor = useRef(new QualityGovernor())
  useFrame((_, delta) => {
    if (import.meta.env.DEV || MAX_QUALITY) return // Default full quality never silently changes.
    const game = useGameStore.getState()
    const mode = governor.current.observe(delta, !game.paused && !document.hidden && !['loading', 'error'].includes(game.state), game.performanceMode)
    if (mode !== game.performanceMode) useGameStore.setState({ performanceMode: mode })
  })
  return null
}
