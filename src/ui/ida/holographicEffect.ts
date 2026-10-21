import { fragmentSource, vertexSource } from './holographicShaders'

type OrientationSource = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<PermissionState> }
let grantedOrientation: OrientationSource | undefined

/** Original tilt/foil interaction, with lifecycle cleanup for React and pause support. */
export function holographicEffect(scene: HTMLElement, card: HTMLElement, canvas: HTMLCanvasElement,
  artwork: HTMLImageElement, reducedMotion: boolean, onMotionPermission?: (needed: boolean) => void) {
  const state = { x: .5, y: .5, light: 0 }, target = { ...state }
  const motionTarget = { ...state }
  const events = new AbortController()
  const on = { signal: events.signal }
  let frame = 0, paused = false, previousTime = 0, pointerInside = false
  let motionAttached = false, permissionRequested = false
  let neutral: { beta: number; gamma: number; angle: number } | undefined
  const orientation = typeof window !== 'undefined' && window.isSecureContext &&
    window.matchMedia('(any-pointer: coarse)').matches && !reducedMotion
    ? window.DeviceOrientationEvent as OrientationSource | undefined : undefined
  let draw: (() => void) | undefined
  let resizeGL: (() => void) | undefined
  let disposeGL: (() => void) | undefined
  let releaseContext: (() => void) | undefined

  function render(time: number) {
    frame = 0
    // Keep the source's 60 Hz response on high-refresh and throttled screens.
    const step = previousTime ? Math.min((time - previousTime) / (1000 / 60), 3) : 1
    previousTime = time
    const easing = reducedMotion ? 1 : 1 - Math.pow(.88, step)
    state.x += (target.x - state.x) * easing
    state.y += (target.y - state.y) * easing
    state.light += (target.light - state.light) * (reducedMotion ? 1 : 1 - Math.pow(.85, step))
    const rotateX = reducedMotion ? 0 : (.5 - state.y) * 18
    const rotateY = reducedMotion ? 0 : (state.x - .5) * 18
    const scale = reducedMotion ? 1 : 1 + state.light * .025
    card.style.transform = `rotateX(${rotateX.toFixed(4)}deg) rotateY(${rotateY.toFixed(4)}deg) scale(${scale.toFixed(5)})`
    draw?.()
    // Redraw while hovering, including a stationary pointer: a composited 3D
    // canvas must not depend on its last submitted frame remaining on screen.
    if ((pointerInside && !reducedMotion) || Math.abs(target.x - state.x) + Math.abs(target.y - state.y) + Math.abs(target.light - state.light) > .0001) wake()
    else previousTime = 0
  }
  function wake() { if (!frame && !paused && !document.hidden) frame = requestAnimationFrame(render) }
  function reset() { Object.assign(target, motionTarget); wake() }
  function calibrate() {
    neutral = undefined
    Object.assign(motionTarget, { x: .5, y: .5, light: 0 })
    if (!pointerInside) reset()
  }
  function tilt(event: DeviceOrientationEvent) {
    if (paused || document.hidden || event.beta === null || event.gamma === null ||
      !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return
    const angle = window.screen.orientation?.angle ?? window.orientation ?? 0
    if (!neutral || neutral.angle !== angle) {
      calibrate()
      neutral = { beta: event.beta, gamma: event.gamma, angle }
    }
    const beta = (event.beta - neutral.beta + 540) % 360 - 180
    const gamma = (event.gamma - neutral.gamma + 540) % 360 - 180
    const radians = angle * Math.PI / 180
    const x = gamma * Math.cos(radians) + beta * Math.sin(radians)
    const y = beta * Math.cos(radians) - gamma * Math.sin(radians)
    const nextX = Math.max(0, Math.min(1, .5 + x / 60))
    const nextY = Math.max(0, Math.min(1, .5 + y / 60))
    const light = Math.min(1, Math.hypot(x, y) / 15)
    // Ignore sensor noise; the existing animation loop smooths actual movement.
    if (Math.abs(nextX - motionTarget.x) + Math.abs(nextY - motionTarget.y) + Math.abs(light - motionTarget.light) < .002) return
    Object.assign(motionTarget, { x: nextX, y: nextY, light })
    if (!pointerInside) reset()
  }
  function attachMotion() {
    if (motionAttached || events.signal.aborted) return
    window.addEventListener('deviceorientation', tilt, on)
    motionAttached = true
  }
  async function enableMotion() {
    if (!orientation || motionAttached || permissionRequested) return
    permissionRequested = true
    try {
      if (!orientation.requestPermission || await orientation.requestPermission() === 'granted') {
        grantedOrientation = orientation
        attachMotion()
      }
    } catch { /* Touch and keyboard remain available when sensors are blocked. */ }
    finally { if (!events.signal.aborted) onMotionPermission?.(false) }
  }
  const needsPermission = !!orientation?.requestPermission && grantedOrientation !== orientation
  onMotionPermission?.(needsPermission)
  if (orientation && !needsPermission) attachMotion()
  function aim(event: PointerEvent) {
    if (paused) return
    pointerInside = true
    const rect = scene.getBoundingClientRect()
    target.x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    target.y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    target.light = 1
    wake()
  }

  function initGL() {
    disposeGL?.()
    draw = undefined; resizeGL = undefined; disposeGL = undefined
    canvas.hidden = true
    // This small canvas renders on demand. Keep its final frame while CSS 3D
    // transforms/compositing continue, instead of relying on a discarded buffer.
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false, depth: false, preserveDrawingBuffer: true })
    if (!gl || gl.isContextLost()) return
    releaseContext = () => gl.getExtension('WEBGL_lose_context')?.loseContext()
    const shaders: WebGLShader[] = []
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)
      if (!shader) return null
      shaders.push(shader)
      gl.shaderSource(shader, source); gl.compileShader(shader)
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null
    }
    const vertex = compile(gl.VERTEX_SHADER, vertexSource), fragment = compile(gl.FRAGMENT_SHADER, fragmentSource)
    const program = gl.createProgram(), buffer = gl.createBuffer(), texture = gl.createTexture()
    disposeGL = () => {
      gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteProgram(program)
      shaders.forEach(shader => gl.deleteShader(shader))
    }
    if (!vertex || !fragment || !program || !buffer || !texture) { disposeGL(); return }
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { disposeGL(); return }
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    const pointer = gl.getUniformLocation(program, 'pointer'), strength = gl.getUniformLocation(program, 'strength')
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.uniform1i(gl.getUniformLocation(program, 'artwork'), 0)
    let ready = false
    resizeGL = () => {
      const dpr = Math.min(devicePixelRatio || 1, 3)
      const width = Math.max(1, Math.round(scene.clientWidth * dpr))
      const height = Math.max(1, Math.round(scene.clientHeight * dpr))
      // Assigning even the same dimensions clears a WebGL drawing buffer.
      if (canvas.width !== width) canvas.width = width
      if (canvas.height !== height) canvas.height = height
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    const upload = () => {
      if (!artwork.naturalWidth || gl.isContextLost()) return
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, artwork)
        ready = true; resizeGL?.(); wake()
      } catch { canvas.hidden = true }
    }
    draw = () => {
      if (!ready || gl.isContextLost()) return
      gl.uniform2f(pointer, state.x, state.y); gl.uniform1f(strength, state.light)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      canvas.hidden = false
    }
    if (artwork.complete && artwork.naturalWidth) upload()
    else artwork.addEventListener('load', upload, { ...on, once: true })
  }
  initGL()
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); canvas.hidden = true; draw = undefined
  }, on)
  canvas.addEventListener('webglcontextrestored', initGL, on)
  const observer = new ResizeObserver(() => { resizeGL?.(); wake() })
  observer.observe(scene)
  scene.addEventListener('pointermove', aim, on)
  scene.addEventListener('pointerenter', aim, on)
  scene.addEventListener('pointerleave', () => { pointerInside = false; reset() }, on)
  // Listen on the stable hit area, including the margin around the tilted face.
  scene.addEventListener('pointerdown', event => {
    if (paused) return
    event.preventDefault()
    card.focus({ preventScroll: true })
    if (event.pointerType !== 'mouse') scene.setPointerCapture(event.pointerId)
    aim(event)
  }, on)
  scene.addEventListener('pointerup', event => {
    if (event.pointerType !== 'mouse') {
      pointerInside = false; reset()
      // Request after releasing the touch so a permission sheet cannot trap a drag.
      if (!paused) void enableMotion()
    }
  }, on)
  scene.addEventListener('pointercancel', () => { pointerInside = false; reset() }, on)
  scene.addEventListener('click', () => { if (!paused) void enableMotion() }, on)
  card.addEventListener('blur', () => { if (!pointerInside) reset() }, on)
  card.addEventListener('keydown', event => {
    if (orientation && !paused && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault(); void enableMotion(); return
    }
    const directions: Record<string, number[]> = { ArrowLeft: [-.12, 0], ArrowRight: [.12, 0], ArrowUp: [0, -.12], ArrowDown: [0, .12] }
    if (event.key === 'Escape') { event.preventDefault(); calibrate(); reset(); return }
    if (!directions[event.key] || paused) return
    event.preventDefault()
    const [x, y] = directions[event.key]
    target.x = Math.max(0, Math.min(1, target.x + x)); target.y = Math.max(0, Math.min(1, target.y + y))
    target.light = 1; wake()
  }, on)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame); frame = 0; previousTime = 0
    } else { if (motionAttached) calibrate(); wake() }
  }, on)
  return {
    setPaused(value: boolean) {
      const resumed = paused && !value
      paused = value; previousTime = 0
      if (paused) { cancelAnimationFrame(frame); frame = 0 }
      else { if (resumed && motionAttached) calibrate(); wake() }
    },
    dispose() {
      events.abort(); observer.disconnect(); cancelAnimationFrame(frame)
      disposeGL?.()
      // React StrictMode and preference changes reuse a connected canvas.
      // Release the extra context only after a real DOM unmount, on replay.
      queueMicrotask(() => { if (!canvas.isConnected) releaseContext?.() })
      card.style.transform = ''; canvas.hidden = true
    },
  }
}
