# Проверка этапа 2

Дата: 28.09.2026. Этап: полный игровой цикл; финальные GLB/cinematic/greeting/share ещё не реализованы. Предыдущий срез зафиксирован отдельно в VERIFICATION.md.

## Автоматические проверки

- TypeScript strict / build typecheck: PASS.
- Vitest: 28 / 28 PASS, 4 files. Overlap и инварианты session/attempt, 27 этажей, границы difficulty, более лёгкий финал, ограничения retry assistance, последовательное включение окон, отсутствие audio до interaction, mute/pause, два переиспользуемых player.
- Production build: PASS, 1168 modules. Main ~410 KB / 130 KB gzip; 3D ~3.163 MB / 1.084 MB gzip; SDK ~90 KB / 27 KB gzip; CSS ~11 KB / 3 KB gzip.
- Development controls отсутствуют в production JavaScript.

## Browser integration

Codex in-app Browser: настоящий Canvas/WebGL и Rapier WASM. Для детерминированных исходов нажимались видимые development-кнопки, задающие releaseX. Все этажи падали и сталкивались физически; игровые состояния через evaluation не изменялись.

| Сценарий | Результат |
| --- | --- |
| Первая партия, все 27 этажей | PASS; один success со смещением, один fail, сохранённые этажи остаются на месте |
| Повтор после fail | Та же высота, mistakes=1, retryCount=1; успешная установка сбрасывает retryCount |
| Вторая чистая партия | PASS; 27/27, celebration, дальнейшие сбросы блокируются |
| Последний этаж | Скорость 1.25 / амплитуда 2.35 вместо 1.70 / 2.80 на 26-м |
| Replay после завершения | 0 этажей, без повторного tutorial, чистые stats; доступно новое строительство |
| Три возврата на старт во время падения | PASS; старое физическое событие не добавляет этаж в новую session |
| Геометрии / текстуры после этих повторов | 26 / 1; значения не растут с 1 → 27 этажей и после повторов в чистом запуске |
| Физические тела | 1 fixed в ожидании, максимум 2 во время падения; 1 после replay |
| Рендер | Четыре instanced группы этажей; draw calls сцены зависят от видимости крана/основания, не от числа этажей |
| Production pointer / Space / Enter | Физические сбросы работают без debug controls; после последовательности успешной установки и промахов башня сохранила 1 этаж |
| Sound toggle в production | Меняет aria-pressed и подпись; off сохраняется после reload; исходное on восстановлено после QA |

Проверка смены viewport на высокой башне обнаружила устаревшую bounding sphere instanced mesh. Исправлено: четыре ограниченные группы этажей используют frustumCulled=false; визуальная башня сохраняется при слежении камеры и resize. Это не отключает ограничение числа instances.

На 320×568 исправлено пересечение крана со счётчиком: zoom учитывает минимальную видимую высоту, target имеет отступ под HUD. Completion CTA и sound toggle находятся внутри viewport; горизонтального overflow нет. Основные кадры: screenshots/stage-2-floor-24-320x568.png, stage-2-floor-24.png, stage-2-complete-320x568.png, stage-2-complete-390x844.png.

Completion проверен на 320×568, 375×667, 390×844, 393×852, 430×932 и desktop 1280×720. Во всех случаях карточка/CTA и sound toggle находятся внутри viewport, overflow отсутствует. Desktop игровая область центрирована и ограничена 600 px. Скриншоты каждого размера сохранены с префиксом stage-2-complete-.

Production intro проверен на тех же шести точных размерах контента без overflow и без debug controls; CTA и footer находятся внутри viewport. Сохранены stage-2-intro-*.png. Дополнительно просмотрена закреплённая вкладка с меньшей доступной высотой; основной QA выполнен в новой вкладке с точным viewport.

## Практические ограничения

- Haptics подключены guarded API; работа на настоящих Telegram iOS/Android ещё не проверена. Mobile viewport emulation не заменяет реальные устройства, safe areas и lifecycle WebView.
- Audio manager проверен unit tests; iOS audio unlock и качество звука требуют прослушивания на устройствах.
- Renderer counters — ограниченная диагностика ресурсов, не полный heap/GPU memory профиль и не FPS benchmark.
- Vite warning о chunk >500 KB остаётся: загрузка Rapier WASM и 3D bundle оптимизируется перед выпуском. Upstream warning Rapier initialization сохраняется без патча зависимости.
- Обзор после 27 этажей и карточка завершения технические; праздничная финальная последовательность появится на этапе 4, поздравление на этапе 5.
