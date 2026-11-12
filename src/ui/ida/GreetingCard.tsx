import { defaultIcons } from '../fluid/icon-context'
import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useGameStore } from '../../game/store'
import { findGreeting } from '../../game/greetings'
import { audioManager } from '../../audio/AudioManager'
import { IdaButton } from './IdaButton'
import { HolographicCard } from './HolographicCard'

export default function GreetingCard() {
  const id = useGameStore(s => s.greetingId)
  const reduced = !!useReducedMotion()
  const greeting = findGreeting(id)
  const [ready, setReady] = useState(reduced)
  const [downloadRequested, setDownloadRequested] = useState(false)
  const panel = useRef<HTMLElement>(null)
  useEffect(() => {
    if (ready) panel.current?.querySelector<HTMLElement>('.holo-card')?.focus({ preventScroll: true })
  }, [ready])
  if (!greeting) return null
  return <motion.section ref={panel} className="postcard-overlay" aria-labelledby="greeting-heading"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0 : .35 }}>
    <h1 className="sr-only" id="greeting-heading">Твоя новогодняя открытка</h1>
    <div className="postcard-layout">
      <div className="postcard-display">
        <motion.div className="postcard-entrance" inert={!ready} initial={{ opacity: 0, y: reduced ? 0 : 28, scale: reduced ? 1 : .88, rotate: reduced ? 0 : -3 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
          transition={{ delay: reduced ? 0 : .22, duration: reduced ? 0 : .78, ease: [.16, 1, .3, 1] }}
          onAnimationComplete={() => setReady(true)}>
          <HolographicCard key={greeting.id} greeting={greeting} />
        </motion.div>
      </div>
      <motion.div className="postcard-controls" inert={!ready} initial={{ opacity: 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : .65, duration: reduced ? 0 : .35 }}>
        <IdaButton trailingIcon={defaultIcons['arrow-down']} type={undefined} asChild>
          <a href={greeting.artwork} download={`ida-light-2027-${greeting.id}.png`} onClick={() => setDownloadRequested(true)}>Сохранить открытку</a>
        </IdaButton>
        <IdaButton trailingIcon={defaultIcons['rotate-ccw']} variant="secondary" className="postcard-replay" onClick={() => { audioManager.userGesture(); useGameStore.getState().start() }}>Построить ещё раз</IdaButton>
        {downloadRequested && <p className="postcard-status">Если файл не скачался, <a href={greeting.artwork} target="_blank" rel="noopener noreferrer" className="underline">открой оригинал</a>.</p>}
      </motion.div>
    </div>
  </motion.section>
}
