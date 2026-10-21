import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import type { Greeting } from '../../game/greetings'
import { useGameStore } from '../../game/store'
import { holographicEffect } from './holographicEffect'

export function HolographicCard({ greeting }: { greeting: Greeting }) {
  const scene = useRef<HTMLDivElement>(null), card = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null), image = useRef<HTMLImageElement>(null)
  const effect = useRef<ReturnType<typeof holographicEffect> | null>(null)
  const reduced = !!useReducedMotion()
  const paused = useGameStore(s => s.paused)
  const [failed, setFailed] = useState(false)
  const [needsMotionPermission, setNeedsMotionPermission] = useState(false)
  useEffect(() => {
    if (!scene.current || !card.current || !canvas.current || !image.current || failed) return
    const controller = holographicEffect(scene.current, card.current, canvas.current, image.current, reduced, setNeedsMotionPermission)
    effect.current = controller
    controller.setPaused(useGameStore.getState().paused)
    return () => { controller.dispose(); effect.current = null }
  }, [greeting.artwork, reduced, failed])
  useEffect(() => { effect.current?.setPaused(paused) }, [paused])
  return <div className="holo-scene" ref={scene}>
    <article className="holo-card" ref={card} tabIndex={0} aria-label="Новогодняя голографическая открытка" aria-describedby="postcard-instructions">
      <div className="holo-surface">
        {failed ? <div className="postcard-fallback"><p>{greeting.title}</p><p>{greeting.text}</p><button type="button" onClick={() => setFailed(false)}>Загрузить открытку</button></div>
          : <img ref={image} className="holo-artwork" src={greeting.artwork} width={1052} height={1494} alt={greeting.alt} draggable={false} onError={() => setFailed(true)} />}
        <canvas ref={canvas} className="holo-foil" aria-hidden="true" />
      </div>
    </article>
    {!failed && <div className="holo-hit-area" aria-hidden="true" />}
    {!failed && needsMotionPermission && <span className="holo-motion-hint">Коснись, чтобы включить наклон</span>}
    <p className="sr-only" id="postcard-instructions">Наклоняй телефон, чтобы поворачивать открытку и менять голографический блик. Если нужно разрешение на датчики, коснись открытки или нажми Enter. Также можно управлять пальцем или курсором. С клавиатуры используй стрелки. Escape возвращает исходное положение.</p>
  </div>
}
