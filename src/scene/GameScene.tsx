import { isFinalState } from '../game/types'
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Physics, useRapier } from '@react-three/rapier'
import { useGameStore } from '../game/store'
import { useDevSettings } from '../game/devSettings'
import { GAME_CONFIG } from '../game/gameConfig'
import { TowerSupport } from '../physics/FloorPhysics'
import { GameCamera } from './GameCamera'
import { Lighting } from './Lighting'
import { Crane } from './Crane'
import { ActiveFloor } from './tower/ActiveFloor'
import { FloorInstances } from './tower/FloorInstances'
import { useSceneStats } from './debugStats'
import { Preload } from '@react-three/drei'
import { WinterAssets } from './WinterAssets'
import { WinterShadows } from './WinterShadows'
import { WinterGlows } from './WinterGlows'
import { City } from './City'
import { Snow } from './Snow'
import { Roof } from './Roof'
import { useAssetLoading } from '../assets/loadingStore'
import { CelebrationController } from '../effects/CelebrationController'
import { AdaptiveQuality } from './AdaptiveQuality'
import { InstancedMesh, type BufferAttribute } from 'three'
import { preloadConfetti } from '../effects/ConfettiLayer'
import { GREETINGS } from '../game/greetings'
import { PostcardTransition } from './PostcardTransition'


function SceneReady() {
  const canvas = useThree(s => s.gl.domElement)
  const renderer = useThree(s => s.gl)
  const scene = useThree(s => s.scene)
  const camera = useThree(s => s.camera)
  const { world } = useRapier()
  const elapsed = useRef(0)
  const frames = useRef<number[]>([])
  const buffers = useRef<{ attribute: BufferAttribute; version: number }[]>([])
  const uploads = useRef({ frames: 0, count: 0 })
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const previous = renderer.info.autoReset
    renderer.info.autoReset = false
    buffers.current = []
    scene.traverse(object => {
      if (object instanceof InstancedMesh && (object.userData.instances || object.name.startsWith('Static_') || object.name === 'StaticWindows')) {
        for (const attribute of [object.instanceMatrix, object.instanceColor]) {
          if (attribute) buffers.current.push({ attribute, version: attribute.version })
        }
      }
    })
    return () => { renderer.info.autoReset = previous }
  }, [renderer, scene])
  useFrame((_, delta) => {
    if (!import.meta.env.DEV) return
    uploads.current.frames++
    for (const buffer of buffers.current) {
      if (buffer.version !== buffer.attribute.version) uploads.current.count++
      buffer.version = buffer.attribute.version
    }
    if (delta > 0 && !document.hidden && !useGameStore.getState().paused) {
      frames.current.push(delta * 1000)
      if (frames.current.length > 180) frames.current.shift()
    }
    elapsed.current += delta
    if (elapsed.current >= .5) {
      elapsed.current = 0
      const sorted = [...frames.current].sort((a, b) => a - b)
      useSceneStats.setState({ drawCalls: renderer.info.render.calls, geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures, physicsBodies: world.bodies.len(), triangles: renderer.info.render.triangles,
        bufferWidth: canvas.width, bufferHeight: canvas.height, pixelRatio: renderer.getPixelRatio(),
        fps: sorted.length ? 1000 * sorted.length / sorted.reduce((a, b) => a + b, 0) : 0,
        frameMedian: sorted[Math.floor(sorted.length * .5)] ?? 0, frameP95: sorted[Math.floor(sorted.length * .95)] ?? 0,
        frameMax: sorted.at(-1) ?? 0, slowFrames: sorted.filter(frame => frame > 25).length,
        instanceUploads: uploads.current.count / uploads.current.frames })
      uploads.current = { frames: 0, count: 0 }
    }
    renderer.info.reset()
  }, -100)
  useEffect(() => {
    let active = true
    // Parsing the finale UI/library at floor 17 interrupted the moving floor.
    // Prepare them during loading, alongside the geometry and shader warmup.
    if (useGameStore.getState().state === 'loading') {
      // Warm the first approved card without blocking play or re-decoding on collapse.
      const postcard = new Image()
      postcard.src = GREETINGS[0].artwork
      void postcard.decode().catch(() => {})
      void Promise.all([preloadConfetti(), import('../ui/ida/GreetingCard'), renderer.compileAsync(scene, camera)]).then(() => {
      if (!active) return
      useAssetLoading.setState({ progress: 100 })
      useGameStore.getState().ready()
      }).catch(() => { if (active) useGameStore.getState().reportError('Не удалось подготовить игру. Проверь соединение и открой её снова.') })
    }
    const lost = (event: Event) => {
      event.preventDefault()
      useGameStore.getState().reportError('Графический контекст потерян. Открой игру снова, чтобы продолжить.')
    }
    canvas.addEventListener('webglcontextlost', lost)
    return () => { active = false; canvas.removeEventListener('webglcontextlost', lost) }
  }, [canvas, renderer, scene, camera])
  return null
}

export function GameScene() {
  const paused = useGameStore(s => s.paused)
  const phase = useGameStore(s => s.phase)
  const collapsing = useGameStore(s => s.collapse !== null)
  const debug = useDevSettings(s => s.physicsDebug)
  const gravity = useDevSettings(s => s.gravity)
  const complete = useGameStore(s => isFinalState(s.state))
  return <>
    <AdaptiveQuality /><CelebrationController /><GameCamera /><Lighting /><Snow />
    <PostcardTransition><WinterAssets><Crane /><City /><WinterShadows /><WinterGlows />
    <FloorInstances moving={(fallingTower, activeFloor) => <Physics key={collapsing ? 'collapse' : 'building'} gravity={[0, import.meta.env.DEV ? gravity : GAME_CONFIG.gravity, 0]} timeStep={1 / 60} updatePriority={-10}
      paused={paused || !['falling', 'fail', 'collapse'].includes(phase)} debug={import.meta.env.DEV && debug}>
      <TowerSupport /><ActiveFloor object={activeFloor} />{fallingTower}<SceneReady />
    </Physics>} />
    <Roof active={complete} /><Preload all />
    </WinterAssets></PostcardTransition>
  </>
}
