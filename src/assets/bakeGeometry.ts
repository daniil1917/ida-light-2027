import { BufferGeometry, Float32BufferAttribute, Matrix4 } from 'three'

/** Quantized integer attributes cannot hold metre-sized transformed coordinates. */
export function bakeGeometry(source: BufferGeometry, transform: Matrix4): BufferGeometry {
  const geometry = source.clone()
  for (const name of ['position', 'normal', 'uv']) {
    const attribute = source.getAttribute(name)
    if (!attribute) continue
    const values = new Float32Array(attribute.count * attribute.itemSize)
    for (let i = 0; i < attribute.count; i++) {
      values[i * attribute.itemSize] = attribute.getX(i)
      values[i * attribute.itemSize + 1] = attribute.getY(i)
      if (attribute.itemSize > 2) values[i * attribute.itemSize + 2] = attribute.getZ(i)
    }
    geometry.setAttribute(name, new Float32BufferAttribute(values, attribute.itemSize))
  }
  return geometry.applyMatrix4(transform)
}
