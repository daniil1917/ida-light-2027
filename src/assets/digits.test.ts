import digits from '../../public/fonts/ida-euclid-digits.typeface.json'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { ShapeUtils } from 'three'
import { expect, test } from 'vitest'

test('the native Euclid zero keeps its interior hole inside the outer contour', () => {
  const font = new FontLoader().parse(digits)
  const shapes = font.generateShapes('0', 1)
  expect(shapes).toHaveLength(1)
  expect(shapes[0].holes).toHaveLength(1)
  const outer = ShapeUtils.area(shapes[0].getPoints(32)), hole = ShapeUtils.area(shapes[0].holes[0].getPoints(32))
  expect(outer).toBeLessThan(0); expect(hole).toBeGreaterThan(0)
  expect(Math.abs(outer)).toBeGreaterThan(hole * 2)
  expect(font.generateShapes('2027', 1)).toHaveLength(4)
})
