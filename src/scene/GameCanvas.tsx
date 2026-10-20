import { Suspense } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { MAX_QUALITY, renderDpr } from '../app/performanceConfig'
import { useGameStore } from '../game/store'
import { GameScene } from './GameScene'
import { useEffect } from 'react'
import { DefaultLoadingManager } from 'three'
import { useAssetLoading } from '../assets/loadingStore'

function RenderResolution() {
  const mode = useGameStore(s => s.performanceMode)
  const size = useThree(s => s.size)
  const setDpr = useThree(s => s.setDpr)
  const clock = useThree(s => s.clock)
  const paused = useGameStore(s => s.paused)
  useEffect(() => { setDpr(renderDpr(mode, MAX_QUALITY, devicePixelRatio, size.width, size.height)) }, [mode, size.width, size.height, paused, setDpr])
  // A demand-rendered pause must not become a large physics step on resume.
  useEffect(() => { if (!paused) clock.getDelta() }, [paused, clock])
  return null
}

export default function GameCanvas() {
  const mode = useGameStore(s => s.performanceMode)
  const paused = useGameStore(s => s.paused)
  const initialDpr = renderDpr(mode, MAX_QUALITY, devicePixelRatio, Math.min(innerWidth, 600), innerHeight)
  useEffect(() => {
    const previous = DefaultLoadingManager.onProgress
    DefaultLoadingManager.onProgress = (url, loaded, total) => {
      previous?.(url, loaded, total)
      useAssetLoading.setState(s => ({ progress: Math.max(s.progress, Math.min(99, Math.round(loaded / total * 100))) }))
    }
    return () => { DefaultLoadingManager.onProgress = previous }
  }, [])
  return <Canvas dpr={initialDpr} shadows={false} frameloop={paused ? 'demand' : 'always'}
    gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
    <RenderResolution />
    <Suspense fallback={null}><GameScene /></Suspense>
  </Canvas>
}
