import { GAME_CONFIG } from '../game/gameConfig'
import { motion, useReducedMotion } from 'motion/react'
import { IdaButton } from './ida/IdaButton'
import { useGameStore } from '../game/store'
import { audioManager } from '../audio/AudioManager'

export function IntroScreen() {
  const reduced = useReducedMotion()
  const active = useGameStore(s => s.state === 'intro')
  return <motion.section className="intro" inert={!active} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .2, ease: 'easeOut' }}>
    <div className="intro-copy">
      <h1>Построй<span>2027<span className="title-dot">.</span></span></h1>
      <p>Построй дом из {GAME_CONFIG.targetFloors} этажей<br />и открой новогоднее пожелание.</p>
    </div>
    <div className="intro-action">
      <IdaButton onClick={() => { audioManager.userGesture(); useGameStore.getState().start() }}>Начать строительство</IdaButton>
    </div>
  </motion.section>
}
