import { Button } from './fluid/button'
import { Elevated } from './fluid/elevated'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './fluid/accordion'
import { Switch } from './fluid/switch'
import { Slider } from './fluid/slider'
import { Select, SelectTrigger, SelectContent, SelectItem } from './fluid/select'
import { useGameStore } from '../game/store'
import { useDevSettings } from '../game/devSettings'
import { GAME_CONFIG } from '../game/gameConfig'
import { swingPosition } from '../game/swing'
import { getDifficulty } from '../game/difficulty'
import { useSceneStats } from '../scene/debugStats'
import { audioManager } from '../audio/AudioManager'
import { useCelebrationStore } from '../effects/celebrationStore'
import { GREETINGS } from '../game/greetings'
import { useState } from 'react'

export default function DebugPanel() {
  const [hidden, setHidden] = useState(false)
  const settings = useDevSettings()
  const state = useGameStore(s => s.state)
  const phase = useGameStore(s => s.phase)
  const count = useGameStore(s => s.currentFloor)
  const mistakes = useGameStore(s => s.mistakes)
  const telegram = useGameStore(s => s.telegramStatus)
  const retries = useGameStore(s => s.retryCount)
  const paused = useGameStore(s => s.paused)
  const quality = useGameStore(s => s.performanceMode)
  const stats = useSceneStats()
  const cinematic = useCelebrationStore(s => s.phase)
  const greetingId = useGameStore(s => s.greetingId)
  const supportX = useGameStore(s => s.floors.at(-1)?.x ?? 0)
  const releaseX = useGameStore(s => s.releaseX)
  const spawnSide = useGameStore(s => s.spawnSide)
  const difficulty = getDifficulty(count + 1)
  const canRelease = ['tutorial', 'playing'].includes(state) && phase === 'swinging' && !paused
  const releaseAt = (offset: number) => { audioManager.userGesture(); useGameStore.getState().release((useGameStore.getState().floors.at(-1)?.x ?? 0) + offset) }
  if (hidden) return null
  return <Elevated offset={2} className="debug-panel rounded-xl"><Accordion><AccordionItem value="settings"><AccordionTrigger>Настройки разработки</AccordionTrigger>
    <AccordionContent>
    <div className="debug-content">
      <output aria-label="Диагностика игры">{state} · {phase} · этажи {count} · ошибки {mistakes} · {telegram}</output>
      <output aria-label="Диагностика сцены">вызовы отрисовки {stats.drawCalls} · геометрии {stats.geometries} · текстуры {stats.textures} · тела {stats.physicsBodies}</output>
      <output aria-label="Время кадра">{stats.fps.toFixed(1)} fps · медиана {stats.frameMedian.toFixed(1)} мс · p95 {stats.frameP95.toFixed(1)} мс · треугольники {stats.triangles} · буфер {stats.bufferWidth}×{stats.bufferHeight}</output>
      <output aria-label="Рывки движения">Рассинхронизация {stats.motionError.toFixed(4)} · max {stats.frameMax.toFixed(1)} мс · кадров дольше 25 мс: {stats.slowFrames}</output>
      <output aria-label="Обновления этажей">Обновления буферов этажей: {stats.instanceUploads.toFixed(1)} / кадр</output>
      <output aria-label="Диагностика финала">Финал: {cinematic}</output>
      {phase === 'collapse' && <output aria-label="Падение башни">Наклон {stats.collapseAngle.toFixed(1)}° · высота {stats.collapseY.toFixed(3)}</output>}
      {state === 'greeting' && <label>Вариант пожелания <Select value={greetingId ?? ''} onValueChange={value => useGameStore.setState({ greetingId: value })}><SelectTrigger aria-label="Вариант пожелания" /><SelectContent>
        {GREETINGS.map((greeting, index) => <SelectItem index={index} key={greeting.id} value={greeting.id}>{greeting.title}</SelectItem>)}
      </SelectContent></Select></label>}
      <Switch label="Пауза приложения" checked={paused} onToggle={() => useGameStore.getState().setPaused(!paused)} />
      <Switch label="Статичный финал" checked={settings.staticFinal} onToggle={() => useDevSettings.setState({ staticFinal: !settings.staticFinal })} />
      <output>Диапазон {difficulty.level} · скорость {difficulty.speed.toFixed(2)} · амплитуда {difficulty.amplitude.toFixed(2)} · повтор {retries}</output>
      <output aria-label="Положение башни">Центр башни: {supportX.toFixed(3)} · сброс: {releaseX.toFixed(3)} · подача: {spawnSide === 1 ? 'справа' : 'слева'}</output>
      <label>Качество сцены <Select value={quality} onValueChange={value => useGameStore.setState({ performanceMode: value as 'high' | 'medium' | 'low' })}><SelectTrigger aria-label="Качество сцены" /><SelectContent>
        <SelectItem index={0} value="high">Высокое</SelectItem><SelectItem index={1} value="medium">Среднее</SelectItem><SelectItem index={2} value="low">Низкое</SelectItem>
      </SelectContent></Select></label>
      <Switch label="Ручная скорость и амплитуда" checked={settings.overrideDifficulty} onToggle={() => useDevSettings.setState({ overrideDifficulty: !settings.overrideDifficulty })} />
      {(['swingSpeed', 'amplitude', 'gravity', 'perfectTolerance', 'successTolerance', 'cameraZoom'] as const).map(key => {
        const labels = { swingSpeed: 'Скорость', amplitude: 'Амплитуда', gravity: 'Гравитация', perfectTolerance: 'Перекрытие для точного попадания', successTolerance: 'Перекрытие для посадки', cameraZoom: 'Масштаб камеры' }
        const ranges = { swingSpeed: [0.4, 3.5, 0.05], amplitude: [0, GAME_CONFIG.maxSwingAmplitude, 0.1], gravity: [-22, -3, 0.5], perfectTolerance: [0.8, 0.99, 0.01], successTolerance: [0.3, 0.75, 0.01], cameraZoom: [0.7, 1.3, 0.05] }
        return <Slider key={key} label={labels[key]} value={settings[key]} showValue formatValue={value => value.toFixed(2)}
          min={ranges[key][0]} max={ranges[key][1]} step={ranges[key][2]}
          onChange={value => useDevSettings.setState({ [key]: Number(value) })} />
      })}
      <Switch label="Коллайдеры Rapier" checked={settings.physicsDebug} onToggle={() => useDevSettings.setState({ physicsDebug: !settings.physicsDebug })} />
      <div className="debug-actions">
        <Button type="button" variant="secondary" disabled={!canRelease} onClick={() => releaseAt(0)}>Точно</Button>
        <Button type="button" variant="secondary" disabled={!canRelease} onClick={() => releaseAt(GAME_CONFIG.floorWidth * 0.3)}>Со смещением</Button>
        <Button type="button" variant="secondary" disabled={!canRelease} onClick={() => releaseAt(.12)}>Почти точно</Button>
        <Button type="button" variant="secondary" disabled={!canRelease} onClick={() => releaseAt(.3)}>Небольшое смещение</Button>
        <Button type="button" variant="secondary" disabled={!canRelease} onClick={() => releaseAt(-1.1)}>Смещение влево</Button>
        <Button type="button" variant="secondary" disabled={!canRelease} onClick={() => releaseAt(1.1)}>Смещение вправо</Button>
        <Button type="button" variant="secondary" disabled={!canRelease} onClick={() => releaseAt(GAME_CONFIG.floorWidth * 0.8)}>Промах</Button>
        <Button type="button" variant="secondary" disabled={!canRelease} onClick={() => useGameStore.getState().release(swingPosition())}>Сбросить</Button>
        <Button type="button" variant="secondary" onClick={() => useGameStore.getState().goToIntro()}>На старт</Button>
        <Button type="button" variant="secondary" onClick={() => setHidden(true)}>Скрыть настройки</Button>
      </div>
    </div></AccordionContent></AccordionItem></Accordion></Elevated>
}
