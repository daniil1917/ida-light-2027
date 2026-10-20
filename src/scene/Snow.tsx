import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useReducedMotion } from 'motion/react'
import { BufferGeometry, Float32BufferAttribute, ShaderMaterial } from 'three'
import { useGameStore } from '../game/store'
import { isFinalState } from '../game/types'
import { celebrationClock as clock, ramp } from '../effects/timeline'
import { CELEBRATION as C } from '../effects/celebrationConfig'

export function Snow() {
  const mode = useGameStore(s => s.performanceMode)
  const reducedMotion = useReducedMotion()
  const count = mode === 'low' ? 110 : mode === 'medium' ? 220 : 360
  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const random = (i: number) => {
      let value = Math.imul(i + 19, 73856093)
      value = Math.imul(value ^ (value >>> 16), 2246822519)
      return ((value ^ (value >>> 13)) >>> 0) / 4294967296
    }
    for (let i = 0; i < positions.length; i++) positions[i] = random(i)
    const geometry = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(positions, 3))
    // Camera-independent coverage keeps the snow visible as the tower grows.
    // All movement runs on the GPU; particle buffers never upload per frame.
    const material = new ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, toneMapped: false,
      uniforms: { time: { value: 0 }, pixelRatio: { value: 1 }, width: { value: 600 }, height: { value: 800 }, boost: { value: 1 } },
      vertexShader: `
        uniform float time, pixelRatio, width, height, boost;
        varying float opacity;
        void main() {
          float depth = position.z;
          float speed = mix(20., 54., depth);
          float y = fract(position.y - time * speed / height);
          float drift = time * mix(3., 10., depth) + sin(time * .55 + position.y * 30.) * 9.;
          float x = fract(position.x + drift / width);
          gl_Position = vec4(vec2(x, y) * 2. - 1., 0., 1.);
          gl_PointSize = mix(1.3, 4.2, depth * depth) * pixelRatio;
          opacity = mix(.34, .72, depth) * min(boost, 1.2);
        }`,
      fragmentShader: `
        varying float opacity;
        void main() {
          float radius = length(gl_PointCoord - vec2(.5));
          float alpha = (1. - smoothstep(.08, .5, radius)) * opacity;
          if (alpha < .01) discard;
          gl_FragColor = vec4(1., 1., 1., alpha);
        }` })
    return { geometry, material }
  }, [count])
  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])
  useFrame(({ gl, size }, delta) => {
    const game = useGameStore.getState()
    const boost = isFinalState(game.state) && !clock.reduced ? 1 + ramp(clock.elapsed, C.snow, C.snowDuration) * (C.snowBoost - 1) : 1
    if (!game.paused && !reducedMotion && !clock.reduced) material.uniforms.time.value += Math.min(delta, .05) * boost
    material.uniforms.pixelRatio.value = gl.getPixelRatio()
    material.uniforms.width.value = size.width
    material.uniforms.height.value = size.height
    material.uniforms.boost.value = boost
  })
  return <points name="Winter snowfall" geometry={geometry} material={material} frustumCulled={false} renderOrder={20} />
}
