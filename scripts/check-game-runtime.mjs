import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { writeFile } from 'node:fs/promises'

// Uses an existing Playwright installation; no browser library ships with the game.
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))
try {
  await page.goto(process.env.GAME_URL || 'http://127.0.0.1:5173/')
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
    window.frames = []; window.motionErrors = []; window.transitions = []; window.longTasks = []
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) window.longTasks.push({ duration: entry.duration, phase: window.game.getState().phase })
    }).observe({ entryTypes: ['longtask'] })
    window.game.subscribe((game, previous) => {
      if (game.phase !== previous.phase) window.transitions.push({ at: performance.now(), phase: game.phase, floor: game.currentFloor, session: game.sessionId })
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
  assert.equal(await page.getByText('Нажми, чтобы сбросить этаж', { exact: true }).count(), 0)
  const snapshots = []
  async function drop(offset, expectedPhase) {
    await page.waitForFunction(() => window.game.getState().phase === 'swinging')
    await page.evaluate(x => window.game.getState().release((window.game.getState().floors.at(-1)?.x ?? 0) + x), offset)
    await page.waitForFunction(phase => window.game.getState().phase === phase, expectedPhase)
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  }
  for (let run = 0; run < 3; run++) {
    for (let floor = 1; floor <= 15; floor++) {
      // An ordinary success as well as perfects; alternate offsets to keep balance.
      await drop(floor % 2 ? .3 : -.3, 'success')
      const snapshot = await page.evaluate(() => {
        const game = window.game.getState(), scene = window.three.getState().scene
        const counts = []; scene.traverse(object => { if (object.name === 'Static_Body' || object.name === 'Static_Snow') counts.push(object.count) })
        const transition = scene.getObjectByName('Finished house to postcard')
        const positions = []; scene.getObjectByName('StaticTower').children[0].instanceMatrix.array.forEach((value, i) => { if (i % 16 === 13 && i / 16 < game.floors.length + 1) positions.push(value) })
        return { run: game.sessionId, floor: game.currentFloor, counts, positions, scale: transition.scale.x, visible: transition.visible }
      })
      assert.equal(snapshot.floor, floor)
      assert(snapshot.counts.length > 0 && snapshot.counts.every(count => count === floor + 1))
      assert.equal(snapshot.scale, 1)
      assert.equal(snapshot.visible, true)
      snapshot.positions.forEach((y, i) => assert(Math.abs(y - (.675 + i * 1.35)) < .0001))
      snapshots.push(snapshot)
    }
    await page.getByRole('button', { name: 'Построить ещё раз' }).waitFor({ timeout: 30000 })
    // Reproduce replay after the entire scene has shrunk and become hidden.
    await page.waitForFunction(() => !window.three.getState().scene.getObjectByName('Finished house to postcard').visible)
    await page.getByRole('button', { name: 'Построить ещё раз' }).click()
    console.log(`Completed physical run ${run + 1}: 15 floors and delayed replay`)
  }
  for (let miss = 0; miss < 3; miss++) await drop(3, 'fail')
  await page.waitForFunction(() => window.game.getState().currentFloor === 0 && window.game.getState().mistakes === 0 && window.game.getState().phase === 'swinging')
  for (let floor = 0; floor < 5; floor++) await drop(1.116, floor === 4 ? 'collapse' : 'success')
  await page.waitForFunction(() => window.game.getState().currentFloor === 0 && window.game.getState().phase === 'swinging', null, { timeout: 15000 })
  await drop(0, 'perfect')
  const diagnostics = await page.evaluate(() => ({ motionErrors: window.motionErrors, frames: window.frames, transitions: window.transitions, longTasks: window.longTasks, error: window.game.getState().error }))
  assert.deepEqual(diagnostics.motionErrors, [])
  assert.equal(diagnostics.error, null)
  assert.deepEqual(errors, [])
  const sorted = diagnostics.frames.map(frame => frame.duration).sort((a, b) => a - b)
  const report = { snapshots, ...diagnostics, errors, median: sorted[Math.floor(sorted.length * .5)], p95: sorted[Math.floor(sorted.length * .95)] }
  await writeFile(process.env.GAME_REPORT || '/tmp/ida-runtime-report.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ placedFloors: snapshots.length, misses: 3, collapses: 1, errors, motionErrors: diagnostics.motionErrors.length, median: report.median, p95: report.p95 }))
} finally {
  await browser.close()
}
