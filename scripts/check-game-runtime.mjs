import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, writeFile } from 'node:fs/promises'

// Uses an existing Playwright installation; no browser library ships with the game.
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL || 'chrome', headless: true })
const page = await browser.newPage({ viewport: process.env.CI ? { width: 320, height: 568 } : { width: 390, height: 844 } })
const url = process.env.GAME_URL || 'http://127.0.0.1:5173/'
const errors = []
page.on('pageerror', error => errors.push(error.message))
try {
  await page.goto(url)
  await page.getByRole('button', { name: 'Начать строительство' }).waitFor({ timeout: 60000 })
  const textStyle = await page.locator('.intro-copy p').evaluate(element => {
    const style = getComputedStyle(element)
    return [style.color, style.textShadow, style.webkitTextStrokeWidth]
  })
  assert.deepEqual(textStyle, ['rgb(255, 255, 255)', 'none', '0px'])
  await page.evaluate(async () => {
    window.game = (await import('/src/game/store.ts')).useGameStore
    const source = await (await fetch('/src/scene/GameCanvas.tsx')).text()
    const url = source.match(/from "([^"]*@react-three_fiber[^"]*)"/)[1]
    window.three = (await import(url))._roots.get(document.querySelector('canvas')).store
    window.frames = []; window.motionErrors = []; window.renderErrors = []; window.renderedFrames = 0; window.transitions = []; window.longTasks = []
    window.landings = {}
    const state = window.three.getState(), render = state.gl.render.bind(state.gl)
    const meshIds = state.scene.getObjectByName('StaticTower').children.map(mesh => mesh.uuid)
    state.gl.render = (scene, camera) => {
      const game = window.game.getState(), tower = state.scene.getObjectByName('StaticTower'), active = state.scene.getObjectByName('ActiveFloor')
      if (scene === state.scene && !game.collapse && ['falling', 'success', 'perfect'].includes(game.phase) && game.state !== 'greeting') {
        window.renderedFrames++
        const moving = ['falling', 'fail'].includes(game.phase), expected = game.currentFloor + 1 + Number(moving)
        const wreaths = Array.from({ length: expected }, (_, number) => number).filter(number => number <= 1 || number % 4 === 0).length
        tower.children.forEach((mesh, index) => {
          if (mesh.uuid !== meshIds[index]) window.renderErrors.push('Mesh replaced at contact')
          if (mesh.count !== (mesh.name === 'Static_Wreath' ? wreaths : expected)) window.renderErrors.push(`Missing or duplicate instance: ${mesh.name} ${mesh.count}/${expected} ${game.phase}`)
          if (moving && active.visible && mesh.name !== 'Static_Wreath') {
            const offset = (mesh.count - 1) * 16
            if (Math.abs(mesh.instanceMatrix.array[offset + 13] - active.position.y) > .0001) window.renderErrors.push('Moving floor is not rendered at its carrier pose')
          }
        })
        if (active.children.length) window.renderErrors.push('Duplicate non-instanced floor model')
        if (!moving && !window.landings[game.attemptId]) {
          const transition = state.scene.getObjectByName('Finished house to postcard')
          const matrix = tower.children[0].instanceMatrix.array
          window.landings[game.attemptId] = {
            run: game.sessionId, floor: game.currentFloor, phase: game.phase,
            counts: tower.children.filter(mesh => mesh.name !== 'Static_Wreath').map(mesh => mesh.count),
            positions: Array.from({ length: expected }, (_, i) => matrix[i * 16 + 13]),
            scale: transition.scale.x, visible: transition.visible,
          }
        }
      }
      return render(scene, camera)
    }
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) window.longTasks.push({ duration: entry.duration, phase: window.game.getState().phase })
    }).observe({ entryTypes: ['longtask'] })
    window.game.subscribe((game, previous) => {
      if (game.phase !== previous.phase) window.transitions.push({ at: performance.now(), phase: game.phase, floor: game.currentFloor, session: game.sessionId, attempt: game.attemptId })
    })
    let previous = performance.now()
    function sample(now) {
      const game = window.game.getState(), scene = window.three.getState().scene
      window.frames.push({ duration: now - previous, phase: game.phase, at: now }); previous = now
      const active = scene.getObjectByName('ActiveFloor')
      if (game.phase === 'falling' && active?.visible) {
        const landingY = 1.35 + (game.currentFloor + .5) * 1.35
        if (active.position.y < landingY - .1 || active.position.y > landingY + 4.1) {
          window.motionErrors.push({ floor: game.currentFloor, y: active.position.y, landingY })
        }
      }
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
  await page.getByRole('button', { name: 'Начать строительство' }).click()
  const sceneFocus = await page.locator('.scene-area').evaluate(element => {
    element.focus(); const style = getComputedStyle(element); return [style.outlineStyle, style.boxShadow]
  })
  assert.deepEqual(sceneFocus, ['none', 'none'])
  assert.equal(await page.getByText('Нажми, чтобы сбросить этаж', { exact: true }).count(), 0)
  const snapshots = []
  async function drop(offset, expectedPhase) {
    await page.waitForFunction(() => window.game.getState().phase === 'swinging')
    const attempt = await page.evaluate(x => {
      const game = window.game.getState()
      game.release((game.floors.at(-1)?.x ?? 0) + x)
      return game.attemptId
    }, offset)
    await page.waitForFunction(({ phase, attempt }) => window.transitions.some(t => t.phase === phase && t.attempt === attempt), { phase: expectedPhase, attempt })
    return attempt
  }
  // The shared CI runner uses software rendering. Keep a full game plus replay
  // there, and three full games for local regression runs.
  for (let run = 0; run < (process.env.CI ? 1 : 3); run++) {
    for (let floor = 1; floor <= 15; floor++) {
      // An ordinary success as well as perfects; alternate offsets to keep balance.
      const attempt = await drop(floor % 2 ? .3 : -.3, 'success')
      const snapshot = await (await page.waitForFunction(id => window.landings[id], attempt)).jsonValue()
      assert.equal(snapshot.floor, floor)
      assert(snapshot.counts.length > 0 && snapshot.counts.every(count => count === floor + 1), JSON.stringify(snapshot))
      assert.equal(snapshot.scale, 1)
      assert.equal(snapshot.visible, true)
      snapshot.positions.forEach((y, i) => assert(Math.abs(y - (.675 + i * 1.35)) < .0001))
      snapshots.push(snapshot)
    }
    await page.getByRole('button', { name: 'Построить ещё раз' }).waitFor({ timeout: 30000 })
    await page.waitForFunction(() => document.activeElement?.classList.contains('holo-card'))
    if (run === 0) {
      const save = page.getByRole('link', { name: 'Сохранить открытку' })
      const [download] = await Promise.all([page.waitForEvent('download'), save.click()])
      const artwork = await save.getAttribute('href')
      assert.deepEqual(await readFile(await download.path()), await readFile(`public${artwork}`))
      assert.equal(await page.getByRole('link', { name: 'открой оригинал' }).getAttribute('href'), artwork)
      assert.equal(await page.getByText('Открытка сохранена', { exact: false }).count(), 0)
    }
    const cardFocus = await page.locator('.holo-card').evaluate(element => {
      const shadow = getComputedStyle(element).boxShadow
      element.focus(); const style = getComputedStyle(element)
      return { outline: style.outlineStyle, unchangedShadow: style.boxShadow === shadow, shadow: style.boxShadow }
    })
    assert.equal(cardFocus.outline, 'none')
    assert.equal(cardFocus.unchangedShadow, true)
    assert(!cardFocus.shadow.includes('36, 91, 243'))
    // Reproduce replay after the entire scene has shrunk and become hidden.
    await page.waitForFunction(() => !window.three.getState().scene.getObjectByName('Finished house to postcard').visible)
    await page.getByRole('button', { name: 'Построить ещё раз' }).click()
    console.log(`Completed physical run ${run + 1}: 15 floors and delayed replay`)
  }
  await drop(0, 'perfect')
  for (let miss = 0; miss < 3; miss++) await drop(3, 'fail')
  await page.waitForFunction(() => window.game.getState().currentFloor === 0 && window.game.getState().mistakes === 0 && window.game.getState().phase === 'swinging')
  for (let floor = 0; floor < 5; floor++) await drop(1.116, floor === 4 ? 'collapse' : 'success')
  await page.waitForFunction(() => window.game.getState().currentFloor === 0 && window.game.getState().phase === 'swinging', null, { timeout: 15000 })
  await drop(0, 'perfect')
  const diagnostics = await page.evaluate(() => ({ motionErrors: window.motionErrors, renderErrors: window.renderErrors, renderedFrames: window.renderedFrames, frames: window.frames, transitions: window.transitions, longTasks: window.longTasks, error: window.game.getState().error }))
  assert.deepEqual(diagnostics.motionErrors, [])
  assert.deepEqual(diagnostics.renderErrors, [])
  assert(diagnostics.renderedFrames > 100)
  assert.equal(diagnostics.error, null)
  assert.deepEqual(errors, [])
  const sorted = diagnostics.frames.map(frame => frame.duration).sort((a, b) => a - b)
  const report = { snapshots, ...diagnostics, errors, median: sorted[Math.floor(sorted.length * .5)], p95: sorted[Math.floor(sorted.length * .95)] }
  await writeFile(process.env.GAME_REPORT || '/tmp/ida-runtime-report.json', JSON.stringify(report, null, 2))
  const stalled = await browser.newPage()
  let requests = 0
  await stalled.route('**/winter/**/winter-site.glb', route => { if (++requests > 1) return route.continue() })
  await stalled.goto(url)
  await stalled.getByText('Загрузка заняла слишком много времени.', { exact: false }).waitFor({ timeout: 40_000 })
  await stalled.getByRole('button', { name: 'Открыть заново' }).click()
  await stalled.getByRole('button', { name: 'Начать строительство' }).waitFor({ timeout: 35_000 })
  assert(requests >= 2)
  console.log(JSON.stringify({ placedFloors: snapshots.length, misses: 3, collapses: 1, errors, motionErrors: diagnostics.motionErrors.length, renderErrors: diagnostics.renderErrors.length, renderedFrames: diagnostics.renderedFrames, median: report.median, p95: report.p95 }))
} finally {
  await browser.close()
}
