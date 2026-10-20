import { afterEach, expect, it, vi } from 'vitest'
import { publicAsset } from './publicAsset'

afterEach(() => vi.unstubAllEnvs())
it.each(['/', '/ida-light-2027/'])('loads models and cards under the deployment base %s', base => {
  vi.stubEnv('BASE_URL', base)
  expect(publicAsset('/winter/high/winter-floor.glb')).toBe(`${base}winter/high/winter-floor.glb`)
  expect(publicAsset('postcards/paper-tree.png')).toBe(`${base}postcards/paper-tree.png`)
})
