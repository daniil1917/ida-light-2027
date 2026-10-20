import { defaultIcons } from './fluid/icon-context'
import { motion, useReducedMotion } from 'motion/react'
import { Elevated } from './fluid/elevated'
import { Badge } from './fluid/badge'
import { FloorCounter } from './ida/FloorCounter'
import { FeedbackBadge } from './ida/FeedbackBadge'
import { TutorialHint } from './ida/TutorialHint'
import { useGameStore } from '../game/store'
import { GAME_CONFIG } from '../game/gameConfig'
import { TowerBalance } from './ida/TowerBalance'

export function GameHUD() {
  const reduced = useReducedMotion()
  const Heart = defaultIcons.heart
  const paused = useGameStore(s => s.paused)
  const mistakes = useGameStore(s => s.mistakes)
  const lives = Math.max(0, GAME_CONFIG.maxLives - mistakes)
  return <motion.div className="game-hud" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .15, ease: 'easeOut' }}>
    <Elevated offset={1} className="game-metrics rounded-xl">
      <FloorCounter /><TowerBalance />
      <Badge className="lives" role="status" aria-live="polite" aria-label={`Осталось жизней: ${lives} из ${GAME_CONFIG.maxLives}`}>
        <span className="sr-only">{lives} из {GAME_CONFIG.maxLives}</span>
        <span aria-hidden="true">{Array.from({ length: GAME_CONFIG.maxLives }, (_, i) => <Heart key={i} className={i < lives ? 'life-full' : 'life-empty'} />)}</span>
      </Badge>
    </Elevated>
    <FeedbackBadge />{!paused && <TutorialHint />}
    {paused && <Elevated offset={1} className="pause-label rounded-xl" role="status">Строительство на паузе</Elevated>}
    {!paused && lives === 0 && <Elevated offset={1} className="restart-label rounded-xl" role="alert"><strong>Жизни закончились</strong><span>Начинаем новый раунд…</span></Elevated>}
  </motion.div>
}
