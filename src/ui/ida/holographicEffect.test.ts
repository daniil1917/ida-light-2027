import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { holographicEffect } from './holographicEffect'

class Element extends EventTarget {
  style = { transform: '' }
  hidden = false
  isConnected = false
  clientWidth = 289
  clientHeight = 410
  context: WebGLRenderingContext | null = null
  contextOptions: WebGLContextAttributes | undefined
  widthWrites = 0
  private widthValue = 0
  height = 0
  get width() { return this.widthValue }
  set width(value: number) { this.widthWrites++; this.widthValue = value }
  getBoundingClientRect() { return { left: 0, top: 0, width: 289, height: 410 } }
  getContext(_type: string, options: WebGLContextAttributes) { this.contextOptions = options; return this.context }
  setPointerCapture = vi.fn()
  focus = vi.fn()
}
const frames = new Map<number, FrameRequestCallback>()
let nextFrame = 0, time = 0, disconnect: ReturnType<typeof vi.fn>
let cleanup: (() => void) | undefined
let resize: () => void
beforeEach(() => {
  frames.clear(); nextFrame = 0; time = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false }))
  disconnect = vi.fn()
  vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { resize = callback } observe() {} disconnect = disconnect })
  vi.stubGlobal('devicePixelRatio', 2)
})
afterEach(() => { cleanup?.(); vi.unstubAllGlobals() })
function flush() {
  for (let i = 0; frames.size && i < 180; i++) {
    const pending = [...frames.values()]; frames.clear(); time += 1000 / 60
    pending.forEach(callback => callback(time))
  }
}
function mount(reduced = false, context: WebGLRenderingContext | null = null, permission?: (needed: boolean) => void) {
  const scene = new Element(), card = new Element(), canvas = new Element()
  canvas.context = context
  const effect = holographicEffect(scene as unknown as HTMLElement, card as unknown as HTMLElement,
    canvas as unknown as HTMLCanvasElement, { complete: true, naturalWidth: 1052 } as HTMLImageElement, reduced, permission)
  cleanup = effect.dispose
  return { scene, card, canvas, effect }
}
function key(target: EventTarget, key: string) {
  const event = Object.assign(new Event('keydown', { cancelable: true }), { key })
  target.dispatchEvent(event)
  return event
}
it('keeps drawing at a stationary hovered corner and stops after leaving', () => {
  const { scene, card, canvas } = mount()
  expect(canvas.hidden).toBe(true) // Static artwork survives missing WebGL.
  scene.dispatchEvent(Object.assign(new Event('pointermove'), { clientX: 289, clientY: 0 }))
  flush()
  expect(card.style.transform).toContain('rotateX(9.0000deg)')
  expect(card.style.transform).toContain('rotateY(9.0000deg)')
  expect(frames.size).toBe(1)
  scene.dispatchEvent(new Event('pointerleave')); flush()
  expect(card.style.transform).toContain('scale(1.00000)')
  expect(frames.size).toBe(0)
})
it('supports arrow keys, Escape and touch pointer capture/reset', () => {
  const { card, scene } = mount()
  expect(key(card, 'ArrowRight').defaultPrevented).toBe(true); flush()
  expect(card.style.transform).toContain('rotateY(2.159')
  key(card, 'Escape'); flush()
  expect(card.style.transform).toContain('scale(1.00000)')
  scene.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerId: 4, pointerType: 'touch', clientX: 200, clientY: 300 }))
  expect(scene.setPointerCapture).toHaveBeenCalledWith(4); flush()
  scene.dispatchEvent(Object.assign(new Event('pointerup'), { pointerType: 'touch' })); flush()
  expect(card.style.transform).toContain('scale(1.00000)')
})
it('retains the light through a full pointer path to all corners, including upper left', () => {
  const { scene, card, effect } = mount()
  for (const [clientX, clientY] of [[144, 205], [2, 2], [287, 2], [287, 408], [2, 408], [2, 2]]) {
    scene.dispatchEvent(Object.assign(new Event('pointermove'), { clientX, clientY }))
    flush()
    expect(card.style.transform).toContain('scale(1.02500)')
    expect(frames.size).toBe(1)
  }
  expect(card.style.transform).toContain('rotateX(8.912')
  expect(card.style.transform).toContain('rotateY(-8.875')
  effect.setPaused(true)
  expect(frames.size).toBe(0)
  effect.setPaused(false); flush()
  expect(frames.size).toBe(1)
  scene.dispatchEvent(new Event('pointerleave')); flush()
  expect(frames.size).toBe(0)
})
it('does not extinguish the light if a click at the tilted edge blurs the face', () => {
  const { scene, card } = mount()
  scene.dispatchEvent(Object.assign(new Event('pointermove'), { clientX: 289, clientY: 0 })); flush()
  card.dispatchEvent(new Event('blur')); flush()
  expect(card.style.transform).toContain('scale(1.02500)')
  scene.dispatchEvent(new Event('pointerleave')); flush()
  expect(card.style.transform).toContain('scale(1.00000)')
})
it('honours pause and removes animation frames, resize observation and input on unmount', () => {
  const { card, effect } = mount()
  key(card, 'ArrowRight'); effect.setPaused(true)
  expect(frames.size).toBe(0)
  key(card, 'ArrowUp'); expect(frames.size).toBe(0)
  effect.setPaused(false); flush()
  expect(card.style.transform).toContain('rotateY(2.159')
  effect.dispose(); cleanup = undefined
  expect(disconnect).toHaveBeenCalledOnce()
  expect(card.style.transform).toBe('')
  key(card, 'ArrowRight'); expect(frames.size).toBe(0)
})
it('keeps the foil usable but disables physical tilt and scale with reduced motion', () => {
  const { card } = mount(true)
  key(card, 'ArrowRight'); flush()
  expect(card.style.transform).toBe('rotateX(0.0000deg) rotateY(0.0000deg) scale(1.00000)')
})
it.each([[2, false], [3, false], [3, true]] as const)('preserves DPR %s and releases only detached canvases (connected %s)', async (dpr, connected) => {
  vi.stubGlobal('devicePixelRatio', dpr)
  const noop = () => {}, resource = () => ({}), draw = vi.fn(), loseContext = vi.fn()
  const context = {
    isContextLost: () => false, createShader: resource, shaderSource: noop, compileShader: noop,
    getShaderParameter: () => true, createProgram: resource, createBuffer: resource, createTexture: resource,
    attachShader: noop, linkProgram: noop, getProgramParameter: () => true, useProgram: noop,
    bindBuffer: noop, bufferData: noop, getAttribLocation: () => 0, enableVertexAttribArray: noop,
    vertexAttribPointer: noop, getUniformLocation: resource, bindTexture: noop, texParameteri: noop,
    uniform1i: noop, texImage2D: noop, viewport: noop, uniform2f: noop, uniform1f: noop, drawArrays: draw,
    deleteTexture: noop, deleteBuffer: noop, deleteProgram: noop, deleteShader: noop,
    getExtension: () => ({ loseContext }),
  } as unknown as WebGLRenderingContext
  const { scene, canvas, effect } = mount(false, context)
  canvas.isConnected = connected
  flush()
  expect(canvas.contextOptions?.preserveDrawingBuffer).toBe(true)
  expect(canvas.hidden).toBe(false)
  expect(canvas.width).toBe(289 * dpr)
  const writes = canvas.widthWrites
  resize(); flush()
  expect(canvas.widthWrites).toBe(writes)
  expect(draw).toHaveBeenCalledTimes(2)
  scene.clientWidth = 300
  resize(); flush()
  expect(canvas.width).toBe(300 * dpr)
  expect(canvas.hidden).toBe(false)
  effect.dispose(); cleanup = undefined
  expect(loseContext).not.toHaveBeenCalled()
  await Promise.resolve()
  expect(loseContext).toHaveBeenCalledTimes(connected ? 0 : 1)
})
it('retains the active light position when the tab is hidden and restored', () => {
  const { card } = mount()
  key(card, 'ArrowRight'); flush()
  Object.assign(document, { hidden: true }); document.dispatchEvent(new Event('visibilitychange'))
  expect(frames.size).toBe(0)
  Object.assign(document, { hidden: false }); document.dispatchEvent(new Event('visibilitychange')); flush()
  expect(card.style.transform).toContain('rotateY(2.159')
})

function mobile(requestPermission?: () => Promise<PermissionState>) {
  const source = Object.assign(class {}, requestPermission ? { requestPermission } : {})
  const device = Object.assign(new EventTarget(), {
    isSecureContext: true, DeviceOrientationEvent: source,
    matchMedia: () => ({ matches: true }), screen: { orientation: { angle: 0 } },
  })
  vi.stubGlobal('window', device)
  return device
}
function orientation(beta: number | null, gamma: number | null) {
  window.dispatchEvent(Object.assign(new Event('deviceorientation'), { beta, gamma })); flush()
}
function rotation(card: Element) {
  return [...card.style.transform.matchAll(/rotate[XY]\((-?[\d.]+)deg\)/g)].map(match => Number(match[1]))
}
function touch(scene: Element, type: string) {
  scene.dispatchEvent(Object.assign(new Event(type), { pointerId: 7, pointerType: 'touch', clientX: 0, clientY: 205 })); flush()
}
it('calibrates mobile tilt, bounds angles, ignores invalid readings and remaps landscape', () => {
  const device = mobile(), permission = vi.fn()
  const { card } = mount(false, null, permission)
  expect(permission).toHaveBeenLastCalledWith(false)
  orientation(40, 5)
  expect(rotation(card)).toEqual([0, 0])
  orientation(55, 35)
  expect(rotation(card)[0]).toBeCloseTo(-4.5, 2)
  expect(rotation(card)[1]).toBeCloseTo(9, 2)
  const previous = card.style.transform
  orientation(null, 0); orientation(Infinity, 0); orientation(45, NaN)
  expect(card.style.transform).toBe(previous)
  device.screen.orientation.angle = 90
  orientation(40, 5)
  expect(rotation(card)[0]).toBeCloseTo(0, 2)
  orientation(70, 5)
  expect(rotation(card)[1]).toBeCloseTo(9, 2)
  orientation(170, -80)
  expect(rotation(card).every(angle => Math.abs(angle) <= 9)).toBe(true)
})
it('unwraps the beta boundary without flipping the card', () => {
  mobile(); const { card } = mount()
  orientation(179, 0); orientation(-179, 0)
  expect(rotation(card)[0]).toBeCloseTo(-.6, 2)
})
it('gives touch priority and returns to the sensor position after release, then cleans up', () => {
  mobile(); const { card, scene, effect } = mount()
  orientation(45, 0); orientation(45, 20)
  expect(rotation(card)[1]).toBeCloseTo(6, 2)
  touch(scene, 'pointerdown')
  orientation(45, 30)
  expect(rotation(card)[1]).toBeCloseTo(-9, 2)
  touch(scene, 'pointerup')
  expect(rotation(card)[1]).toBeCloseTo(9, 2)
  effect.dispose(); cleanup = undefined
  orientation(60, 20)
  expect(card.style.transform).toBe('')
  expect(frames.size).toBe(0)
})
it('stops hidden/paused sensor input and recalibrates on return without a jump', () => {
  mobile(); const { card, effect } = mount()
  orientation(45, 0); orientation(55, 0)
  effect.setPaused(true); const paused = card.style.transform
  orientation(100, 20)
  expect(card.style.transform).toBe(paused)
  effect.setPaused(false); orientation(100, 20)
  expect(rotation(card)[0]).toBeCloseTo(0, 2)
  orientation(115, 20)
  expect(rotation(card)[0]).toBeCloseTo(-4.5, 2)
  Object.assign(document, { hidden: true }); document.dispatchEvent(new Event('visibilitychange'))
  orientation(70, 0)
  expect(frames.size).toBe(0)
  Object.assign(document, { hidden: false }); document.dispatchEvent(new Event('visibilitychange'))
  orientation(70, 0)
  expect(rotation(card)[0]).toBeCloseTo(0, 2)
})
it('requests iOS permission only on touch release and reuses the grant on replay', async () => {
  const request = vi.fn().mockResolvedValue('granted'), permission = vi.fn()
  mobile(request)
  const { card, scene, effect } = mount(false, null, permission)
  expect(permission).toHaveBeenLastCalledWith(true)
  orientation(45, 0)
  expect(request).not.toHaveBeenCalled()
  touch(scene, 'pointerdown')
  expect(request).not.toHaveBeenCalled()
  touch(scene, 'pointerup')
  expect(request).toHaveBeenCalledOnce()
  await Promise.resolve()
  orientation(45, 0); orientation(45, 20)
  expect(rotation(card)[1]).toBeCloseTo(6, 2)
  expect(permission).toHaveBeenLastCalledWith(false)
  effect.dispose()
  const replay = mount(false, null, permission)
  orientation(45, 0); orientation(45, -20)
  expect(rotation(replay.card)[1]).toBeCloseTo(-6, 2)
  expect(request).toHaveBeenCalledOnce()
})
it.each(['denied', 'rejected'])('keeps touch usable when sensor permission is %s', async result => {
  const request = result === 'denied' ? vi.fn().mockResolvedValue('denied') : vi.fn().mockRejectedValue(new Error('blocked'))
  mobile(request); const permission = vi.fn(), { scene, card } = mount(false, null, permission)
  touch(scene, 'pointerup'); await Promise.resolve()
  expect(permission).toHaveBeenLastCalledWith(false)
  orientation(0, 0); orientation(30, 30)
  touch(scene, 'pointerdown')
  expect(rotation(card)[1]).toBeCloseTo(-9, 2)
  touch(scene, 'pointerup')
  expect(rotation(card)[1]).toBeCloseTo(0, 2)
  expect(request).toHaveBeenCalledOnce()
})
it.each(['Enter', 'click'])('can enable sensor permission through %s activation', async activation => {
  const request = vi.fn().mockResolvedValue('granted'); mobile(request)
  const { scene, card } = mount()
  if (activation === 'Enter') expect(key(card, 'Enter').defaultPrevented).toBe(true)
  else scene.dispatchEvent(new Event('click'))
  await Promise.resolve()
  expect(request).toHaveBeenCalledOnce()
  orientation(45, 0); orientation(45, 20)
  expect(rotation(card)[1]).toBeCloseTo(6, 2)
})
it('does not attach sensors or update the permission hint after a late grant on unmount', async () => {
  let grant!: (value: PermissionState) => void
  const device = mobile(() => new Promise(resolve => { grant = resolve })), permission = vi.fn()
  const listen = vi.spyOn(device, 'addEventListener'), { scene, effect } = mount(false, null, permission)
  touch(scene, 'pointerup'); effect.dispose(); cleanup = undefined; permission.mockClear()
  grant('granted'); await Promise.resolve()
  expect(listen).not.toHaveBeenCalled()
  expect(permission).not.toHaveBeenCalled()
})
it.each(['desktop', 'insecure', 'reduced'])('skips sensors for %s', mode => {
  const request = vi.fn().mockResolvedValue('granted'), device = mobile(request)
  if (mode === 'desktop') device.matchMedia = () => ({ matches: false })
  if (mode === 'insecure') device.isSecureContext = false
  const permission = vi.fn(), { scene } = mount(mode === 'reduced', null, permission)
  touch(scene, 'pointerup')
  expect(request).not.toHaveBeenCalled()
  expect(permission).toHaveBeenLastCalledWith(false)
})
