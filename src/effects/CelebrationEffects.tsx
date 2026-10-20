import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, FXAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BloomEffect, ToneMappingMode, VignetteEffect } from 'postprocessing'
import { useGameStore } from '../game/store'
import { CELEBRATION as C } from './celebrationConfig'
import { celebrationClock as clock, ramp, smooth } from './timeline'
import { isFinalState } from '../game/types'

export default function CelebrationEffects() {
  const mode = useGameStore(s => s.performanceMode)
  const bloom = useRef<BloomEffect>(null)
  const vignette = useRef<VignetteEffect>(null)
  useFrame(() => {
    const progress = !isFinalState(useGameStore.getState().state) || clock.reduced ? 0 : smooth(ramp(clock.elapsed, C.bloom, C.bloomDuration))
    if (bloom.current) bloom.current.intensity = .14 + progress * (mode === 'high' ? .14 : .08)
    const darkness = vignette.current?.uniforms.get('darkness')
    if (darkness) darkness.value = progress * C.vignette
  })
  return <EffectComposer multisampling={0} enableNormalPass={false}>
    <Bloom ref={bloom} mipmapBlur luminanceThreshold={1.1} luminanceSmoothing={.15} intensity={.14} resolutionScale={.25} />
    <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    <Vignette ref={vignette} offset={.35} darkness={0} />
    <FXAA />
  </EffectComposer>
}
