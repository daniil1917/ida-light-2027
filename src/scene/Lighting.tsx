import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { AgXToneMapping, Color, PMREMGenerator } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
// Linear RGB and studio power ratios from the approved Blender scene.
const winterAmbient = new Color(.28, .43, .72)
export function Lighting() {
  const renderer = useThree(s => s.gl)
  const scene = useThree(s => s.scene)
  useEffect(() => {
    const studio = new RoomEnvironment(), generator = new PMREMGenerator(renderer)
    const environment = generator.fromScene(studio, .04)
    const previous = scene.environment, previousTone = renderer.toneMapping
    scene.environment = environment.texture; scene.environmentIntensity = .22
    renderer.toneMapping = AgXToneMapping
    studio.dispose(); generator.dispose()
    return () => { scene.environment = previous; renderer.toneMapping = previousTone; environment.dispose() }
  }, [renderer, scene])
  return <><ambientLight color={winterAmbient} intensity={.22} />
    <directionalLight position={[-4.72, 10.45, 6.28]} color="#eef3ff" intensity={2.1} />
    <directionalLight position={[6.28, 8.45, -.72]} color="#bdeeff" intensity={2.1 * 850 / 950} />
    <directionalLight position={[-3.72, 9.45, -6.72]} color="#c7dcff" intensity={2.1 * 1100 / 950} /></>
}
