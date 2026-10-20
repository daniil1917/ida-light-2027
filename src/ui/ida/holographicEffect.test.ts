import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { holographicEffect } from './holographicEffect'

class Element extends EventTarget {
  style = { transform: '' }
  hidden = false
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
function mount(reduced = false, context: WebGLRenderingContext | null = null) {
  const scene = new Element(), card = new Element(), canvas = new Element()
  canvas.context = context
  const effect = holographicEffect(scene as unknown as HTMLElement, card as unknown as HTMLElement,
    canvas as unknown as HTMLCanvasElement, { complete: true, naturalWidth: 1052 } as HTMLImageElement, reduced)
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
it('preserves the last GPU frame and does not clear it on an unchanged resize', () => {
  const noop = () => {}, resource = () => ({}), draw = vi.fn()
  const context = {
    isContextLost: () => false, createShader: resource, shaderSource: noop, compileShader: noop,
    getShaderParameter: () => true, createProgram: resource, createBuffer: resource, createTexture: resource,
    attachShader: noop, linkProgram: noop, getProgramParameter: () => true, useProgram: noop,
    bindBuffer: noop, bufferData: noop, getAttribLocation: () => 0, enableVertexAttribArray: noop,
    vertexAttribPointer: noop, getUniformLocation: resource, bindTexture: noop, texParameteri: noop,
    uniform1i: noop, texImage2D: noop, viewport: noop, uniform2f: noop, uniform1f: noop, drawArrays: draw,
    deleteTexture: noop, deleteBuffer: noop, deleteProgram: noop, deleteShader: noop,
  } as unknown as WebGLRenderingContext
  const { scene, canvas } = mount(false, context)
  flush()
  expect(canvas.contextOptions?.preserveDrawingBuffer).toBe(true)
  expect(canvas.hidden).toBe(false)
  expect(canvas.width).toBe(578)
  const writes = canvas.widthWrites
  resize(); flush()
  expect(canvas.widthWrites).toBe(writes)
  expect(draw).toHaveBeenCalledTimes(2)
  scene.clientWidth = 300
  resize(); flush()
  expect(canvas.width).toBe(600)
  expect(canvas.hidden).toBe(false)
})
it('retains the active light position when the tab is hidden and restored', () => {
  const { card } = mount()
  key(card, 'ArrowRight'); flush()
  Object.assign(document, { hidden: true }); document.dispatchEvent(new Event('visibilitychange'))
  expect(frames.size).toBe(0)
  Object.assign(document, { hidden: false }); document.dispatchEvent(new Event('visibilitychange')); flush()
  expect(card.style.transform).toContain('rotateY(2.159')
})
