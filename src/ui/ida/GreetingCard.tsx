import { defaultIcons } from '../fluid/icon-context'
import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useGameStore } from '../../game/store'
import { findGreeting } from '../../game/greetings'
import { audioManager } from '../../audio/AudioManager'
import { downloadGreeting } from './greetingImage'
import { IdaButton } from './IdaButton'
import { HolographicCard } from './HolographicCard'

export default function GreetingCard() {
  const id = useGameStore(s => s.greetingId)
  const reduced = !!useReducedMotion()
  const greeting = findGreeting(id)
  const [ready, setReady] = useState(reduced)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [failed, setFailed] = useState(false)
  const alive = useRef(true)
  const panel = useRef<HTMLElement>(null)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])
  if (!greeting) return null
  const save = async () => {
    if (busy) return
    setBusy(true); setStatus(''); setFailed(false)
    try {
      await downloadGreeting(greeting)
      if (alive.current) setStatus('Открытка сохранена в исходном качестве.')
    } catch {
      if (alive.current) { setFailed(true); setStatus('Не удалось сохранить. Проверь соединение и попробуй ещё раз.') }
    } finally { if (alive.current) setBusy(false) }
  }
  return <motion.section ref={panel} className="postcard-overlay" aria-labelledby="greeting-heading"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0 : .35 }}>
    <h1 className="sr-only" id="greeting-heading">Твоя новогодняя открытка</h1>
    <div className="postcard-layout">
      <div className="postcard-display">
        <motion.div className="postcard-entrance" inert={!ready} initial={{ opacity: 0, y: reduced ? 0 : 28, scale: reduced ? 1 : .88, rotate: reduced ? 0 : -3 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
          transition={{ delay: reduced ? 0 : .22, duration: reduced ? 0 : .78, ease: [.16, 1, .3, 1] }}
          onAnimationComplete={() => { setReady(true); panel.current?.querySelector<HTMLElement>('.holo-card')?.focus({ preventScroll: true }) }}>
          <HolographicCard key={greeting.id} greeting={greeting} />
        </motion.div>
      </div>
      <motion.div className="postcard-controls" inert={!ready} initial={{ opacity: 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : .65, duration: reduced ? 0 : .35 }}>
        <IdaButton trailingIcon={defaultIcons['arrow-down']} loading={busy} disabled={busy} onClick={() => void save()}>Сохранить открытку</IdaButton>
        <IdaButton trailingIcon={defaultIcons['rotate-ccw']} variant="secondary" className="postcard-replay" onClick={() => { audioManager.userGesture(); useGameStore.getState().start() }}>Построить ещё раз</IdaButton>
        <p role="status" className={failed ? 'postcard-status' : 'sr-only'}>{status}</p>
      </motion.div>
    </div>
  </motion.section>
}
