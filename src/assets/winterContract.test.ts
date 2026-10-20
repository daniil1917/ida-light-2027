import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { getBounds } from '@gltf-transform/functions'
import { MeshoptDecoder } from 'meshoptimizer'
import { expect, test } from 'vitest'
import { GAME_CONFIG as G } from '../game/gameConfig'
import { CRANE_BOOM_HEIGHT } from '../scene/craneLayout'

test('shipped high/mobile floors match the physical collider in metres after Meshopt decoding', async () => {
  await MeshoptDecoder.ready
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
  for (const profile of ['high', 'mobile']) {
    const document = await io.read(`public/winter/${profile}/winter-floor.glb`)
    const scene = document.getRoot().getDefaultScene()!
    expect(scene.listChildren().map(node => node.getName())).toEqual(['FloorBody'])
    const { min, max } = getBounds(scene)
    for (const [axis, size] of [G.floorWidth, G.floorHeight, G.floorDepth].entries()) expect(max[axis] - min[axis]).toBeCloseTo(size, 2)
    expect((min[1] + max[1]) / 2).toBeCloseTo(0, 2)
    const baked = document.getRoot().listMaterials().find(material => material.getName().startsWith('WinterBaked_'))!
    expect(baked.getExtension('KHR_materials_unlit')).not.toBeNull()
    // Native snow top + spreader half height stays below the attachment bar.
    const snow = await io.read(`public/winter/${profile}/winter-snow-cap.glb`)
    const snowTop = getBounds(snow.getRoot().getDefaultScene()!).max[1]
    for (let count = 0; count < G.targetFloors; count++) {
      const suspendedTop = G.baseHeight + (count + .5) * G.floorHeight + G.dropHeight + snowTop
      const barBottom = CRANE_BOOM_HEIGHT + count * G.floorHeight - 1.315 - .0425
      expect(barBottom - suspendedTop).toBeGreaterThan(0)
      expect(barBottom - suspendedTop).toBeLessThan(.025)
      expect(Math.abs(G.craneMastZ)).toBeGreaterThan(G.floorDepth / 2 + .5)
    }
  }
})
