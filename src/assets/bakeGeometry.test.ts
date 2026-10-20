import { describe, expect, it } from 'vitest'
import { BufferGeometry, Int16BufferAttribute, Matrix4 } from 'three'
import { bakeGeometry } from './bakeGeometry'

describe('quantized GLB instancing', () => {
  it('preserves full metre-sized coordinates when baking the dequantization transform', () => {
    const source = new BufferGeometry().setAttribute('position', new Int16BufferAttribute([-32767, 0, 32767, 32767, 0, -32767], 3, true))
    const geometry = bakeGeometry(source, new Matrix4().makeScale(1.5, .41, 1.325))
    expect(geometry.getAttribute('position').getX(0)).toBeCloseTo(-1.5)
    expect(geometry.getAttribute('position').getZ(0)).toBeCloseTo(1.325)
    expect(geometry.getAttribute('position').getX(1)).toBeCloseTo(1.5)
    expect(source.getAttribute('position').getX(1)).toBe(1)
    geometry.dispose(); source.dispose()
  })
})
