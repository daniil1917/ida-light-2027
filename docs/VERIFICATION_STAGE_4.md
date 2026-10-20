# Проверка этапа 4

Дата: 28.09.2026. Добавлена финальная временная шкала, roof/window/2027 reveal, Bloom/Vignette, краткий confetti и синхронизированные cues. Поздравления/share остаются этапом 5.

## Автоматические проверки

- Strict TypeScript: PASS.
- Vitest: **33/33**, 6 files. Четыре новых теста timeline: порядок roof/windows/confetti/card, свет снизу вверх, pause/ограничение delta при возврате, повторная и новая session, reduced motion.
- Production build: PASS, 1190 modules. Main ~411 KB / 131 KB gzip; 3D ~3.30 MB / 1.13 MB gzip; отдельно CelebrationEffects 91.3 KB / 25.1 KB gzip и canvas-confetti 10.7 KB / 4.3 KB gzip. Поздние эффекты не включены в initial UI bundle.
- Сохранены MIT notice wrapper, **Zlib** notice postprocessing core и ISC canvas-confetti. Код upstream не изменён. Audio roof/lightsOn — original CC0 synthesis; sprite map импортируется из сгенерированного metadata.

## Настоящий Canvas / Rapier

Использован Codex in-app Browser. Партии проходились видимыми dev-кнопками, задающими releaseX и запускающими настоящий physical drop. Timeline/store не изменялись из browser evaluation; читались только DOM/diagnostics.

| Сценарий | Результат |
| --- | --- |
| High, 27 этажей | PASS: build → camera → roof → windows/year → confetti → ready; карточка отсутствует до завершения |
| Roof reveal | Captured «Финал: roof», отдельный screenshot; крыша уже отъехавшей башни опускается, цифры ещё скрыты |
| Glow/confetti hero | Captured «Финал: confetti», DOM data-burst=played; видны целая башня, светящиеся 2027/окна и умеренный burst |
| Replay после high | 0 этажей, phase idle, один Canvas, confetti canvas удалён; 1 physical support |
| High resources | Финал: 60 geometries / 25 textures; после replay: 58 / 8. Composer targets и Text3D освобождены, GLTF cache ожидаемо сохранён |
| Draw calls | High final 92, включая shadow и postprocessing passes. Диагностика считает всю предыдущую frame с autoReset=false в dev |
| Low, отдельные 27 этажей | PASS; 50 calls, 59 geometries / 6 textures в текущем cache; нет compositor targets, roof/year/window sequence и 20-particle burst работают |
| Пауза во время roof | «Финал: roof» сохраняется спустя 1.5 s pause; после resume достигает ready, burst запускается один раз |
| Статичный финал, отдельные 27 этажей | PASS: быстро ready, roof/2027/все окна видны; один canvas, confetti canvas=0, 59 geometries / 8 textures, composer отсутствует |
| Tone mapping fallback | Сохранена тёплая палитра при low/static и после replay; HDR bypass применяется только с composer |
| Console | Ошибок в проверенном финале нет. Известный upstream Rapier WASM initialization warning остаётся |
| Повторный high после static | PASS: снова ready, один burst; 92 calls / 60 geometries / 25 textures / 1 body. После replay снова 58 geometries / 8 textures, один Canvas, confetti удалён |
| Адаптивный финал | PASS: 320×568, 375×667, 390×844, 393×852, 430×932, 1280×720; горизонтального overflow нет, кнопка повторной игры внутри viewport. DOM-замеры: research/stage-4-viewports.json |
| Production smoke | PASS: свежая сборка на 4173, loading → intro → game; Space установил этаж, Enter вызвал физический drop и retry, pointer также запускает drop. Один Canvas, dev controls отсутствуют, ошибок приложения нет |

Screenshots: stage-4-before-roof.png, stage-4-roof-reveal.png, **stage-4-hero.png**, stage-4-low-complete.png, stage-4-static-complete.png. Config и runtime lifecycle: CELEBRATION.md.

Во время первого dev-pass Vite обнаруживал lazy dependencies и перезагружал страницу. В optimizeDeps добавлены postprocessing/confetti, после этого первый preload на 24-м проходит без reset игры. Production сборка этим механизмом не пользуется.

Это функциональная WebGL-проверка, не FPS benchmark на смартфонах. OS reduced-motion preference не переключалась: статичная cinematic ветка проверена явным dev QA control и unit tests; настоящий preference подключён через Motion. Реальные Telegram iOS/Android, haptics/audio unlock и FPS относятся к выпуску. Vite >500 KB chunk warning для Three/Rapier остаётся. Финальный экран ещё содержит нейтральное завершение, персональных поздравлений и share пока нет.
