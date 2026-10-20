# Приёмка локальной версии 0.6.0 · 28–29.09.2026

Объём: завершить разработку до публикации/отправки в Telegram. Реализованы этапы 0–5 и проверки локальной части этапа 6. Публикация, настройка BotFather и фактическая отправка не выполнялись.

## Автоматические проверки

- Strict TypeScript: PASS.
- Vitest 4.1.11: **45/45**, 9 files. Identity/storage/replay, чистое отображаемое имя, приватность share URL, clipboard/manual/native cancellation, устойчивая смена качества; прежние physics/store/audio/GLB/timeline инварианты сохранены.
- Production build: PASS. 1249 modules; main ~415 KB / 133 KB gzip, lazy 3D ~3.30 MB / 1.13 MB gzip, GreetingCard ~41.9 KB / 14.8 KB gzip, эффекты ~25.1 KB + confetti ~4.3 KB gzip.
- assets:inspect: **8/8 GLB**, 0 errors / 0 warnings; размеры и bounds сохранены, sum 328732 bytes.
- После обновления тестовых dependencies npm сообщил **0 vulnerabilities**. Vitest обновлён с 3.2.7 до исправленного 4.1.11; runtime dependencies не переписывались.
- Автоматически включены notices **61 runtime package**, ~86.5 KB, отдельным текстовым файлом вне initial загрузки. README/license/archive metadata для отсутствующих npm notices сохранены локально.

## Browser QA

Использован native in-app Browser. Полные dev-партии запускают реальный Rapier drop через видимые кнопки; прямой записи игрового state из browser evaluation нет. DOM evaluation используется только для чтения текстов/границ/диагностики. Production проверяется обычными игровыми controls.

| Сценарий | Результат |
| --- | --- |
| 27 этажей → кинофинал → пожелание | PASS; сначала последовательность, затем greeting; roof/year/lights сохраняются при переходе |
| Первая и вторая high партия | Одно и то же browser пожелание boldness; один burst в каждой session |
| High resource plateau | Оба финала: 60 geometries / 25 textures / 92 calls / 1 body; оба replay: 58 / 8 / 40 / 1; confetti canvas удаляется, остаётся один WebGL Canvas |
| Третья партия low/static | 27 этажей, то же пожелание; 59 geometries / 6 textures / 50 calls / 1 body; один Canvas, confetti отсутствует |
| Все 10 пожеланий на 320×568 | PASS; полный текст и обе CTA помещаются, внутреннего overflow нет; замеры stage-5-wishes-320.json |
| Viewports | 320×568, 375×667, 390×844, 393×852, 430×932, 1280×720: горизонтального overflow нет, share/replay внутри viewport; stage-5-viewports.json |
| Копирование | Реальное нажатие → «Пожелание скопировано.»; unit test отдельно покрывает denied clipboard и manual textarea |
| PNG | Реальное нажатие → загружен ida-light-2027-boldness.png, 1080×1350. Файл открыт и визуально проверен: полный текст, знак/подпись, архитектурный мотив, поля |
| Dialog accessibility | Title/Description, focus trap; Tab с close возвращается к первой кнопке; Escape закрывает, фокус возвращается на trigger |
| Production полный проход | PASS: все 27 этажей обычными касаниями, Space и Enter; 49 нажатий с повторными попытками, промахи сохраняют башню. Показана greeting card partnership, dev controls отсутствуют, горизонтального overflow нет. Копирование из production dialog работает |
| Browser console | Ошибок приложения не обнаружено; известный upstream Rapier WASM warning |

Screenshots: stage-5-greeting.png, stage-5-greeting-card.png (export), stage-5-share.png, stage-5-share-320.png, stage-5-longest-320.png, stage-5-low-static.png, шесть viewport screenshots. Настоящий OS reduced-motion preference не переключался: static QA ветка плюс timeline unit tests; OS preference подключён через Motion.

## Граница проверки

Это functional WebGL/browser QA, не FPS benchmark реальных телефонов. Adaptive quality алгоритм проверен unit tests; DPR/shadows/environment low проверены живой сценой. В Telegram до публикации не отправлялось ни пожелание, ни ссылка. Telegram identity, safe-area notifications, client haptics/audio/PNG download и chooser нужно подтвердить на реальных iOS/Android/Desktop после задания HTTPS URL/бота, согласно LOCAL_RELEASE.md. Известные noncritical сообщения: Vite large lazy chunk и upstream WASM init deprecation. При заблокированном storage пожелание сохраняется только в течение открытого приложения.

Итоговый архив: releases/ida-light-2027-local-0.6.0.zip, 2 981 121 bytes (~2.84 MiB), 41 production file плюс manifest/инструкция; CRC проверен. SHA-256: ebe753e86566390714103275867f2ed6382f652dd2720d7da5317762fe4b3094. Архив не публиковался.
