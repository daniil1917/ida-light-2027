# Финальная последовательность

После реальной посадки 20-го этажа store закрывает release input и переходит в celebration. Крыша/font предзагружены с 17-го. Timeline принадлежит presentation layer и не изменяет позиции сохранённых этажей или физические правила.

| Animation time | Событие |
| --- | --- |
| 0.0 | Успешная последняя посадка; input уже закрыт game commands |
| 0.4–0.8 | Ортографическая камера из сохранённой позиции/zoom отъезжает к общему виду |
| 1.1–1.52 | Roof/crown опускается на 0.8 world unit и мягко останавливается |
| 1.4–2.05 | Дополнительные окна загораются снизу вверх; нейтральный белый свет сохраняется |
| 2.0–2.35 | Настоящий Text3D 2027 появляется и повышает emissive |
| 2.2–2.7 | Bloom плавно усиливается; очень мягкий Vignette |
| 2.4 | Снег немного усиливается без увеличения числа particles |
| 2.7 | Один короткий confetti burst: 70 / 40 / 20 частиц для high / medium / low |
| 4.8 | Появляется персональное пожелание с replay; завершённый дом остаётся видимым над карточкой |

Все ключевые моменты и длительности: src/effects/celebrationConfig.ts. Camera использует smoothstep между snapshots; roof/цифры/snow читают общий clock через useFrame. Clock — отдельный изменяемый объект, кадры не пишутся в React или game store. В celebrationStore попадают только sessionId и смены семантических фаз.

Пауза останавливает Canvas и clock. Delta ограничена: возврат из фона не перескакивает через весь финал. Exit/replay сбрасывает clock, одноразовые audio cues и semantic phase. Callback позднего confetti import проверяет sessionId, game state, pause и cancellation; cleanup сбрасывает renderer. Canvas принадлежит game-shell, pointer-events отключены.

## Эффекты и качество

@react-three/postprocessing/postprocessing используются только в celebration high/medium, отдельный lazy chunk ~91 KB / 25 KB gzip. Bloom resolutionScale .5 / .35, multisampling=0, normal pass выключен. ACES сохраняет сценовую цветопередачу, эмиссивные lights/2027 обходят tone mapping только при работающем HDR composer. При replay восстанавливается обычный renderer и освобождаются render targets.

Low использует emissive без composer, меньше снега и 20 confetti particles. canvas-confetti — отдельный chunk ~11 KB / 4 KB gzip, prefetch с 17-го, один worker burst без interval. Используются resize, disableForReducedMotion и reset.

При reduced motion: камера сразу показывает общий вид, крыша/окна/2027 статичны, снег неподвижен, Bloom/confetti не создаются; карточка появляется через .45 с. MotionConfig обрабатывает OS preference для DOM. Dev-only «Статичный финал (QA)» проверяет ту же ветку cinematic без изменения настроек ОС.

Roof и lightsOn — новые собственные CC0 sprite cues; complete и Telegram success haptic синхронизированы с 2027. Howler сохраняет два app-lifetime player. В reduced motion дополнительные roof/lights cues пропускаются, остаётся короткое завершение.

## Проверка

В dev доступны «Диагностика финала», «Пауза приложения», «Статичный финал (QA)» и выбор качества. Это реальные UI actions, без скрытого изменения store из browser tools. Production этих controls не содержит. Отчёт: VERIFICATION_STAGE_4.md; hero screenshot: screenshots/stage-4-hero.png.

После ready controller вызывает guarded openGreeting(sessionId). Celebration и greeting разделяют финальную сцену и clock: переход UI не повторяет эффекты, не убирает roof/year и не прерывает оставшиеся частицы. GreetingCard — отдельный lazy chunk с preload с 17-го этажа.
