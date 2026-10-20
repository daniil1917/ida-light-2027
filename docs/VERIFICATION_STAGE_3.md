# Проверка этапа 3

Дата: 28.09.2026. Готова архитектурная зимняя сцена с локальными GLB. Управляемый cinematic, персональные пожелания и share относятся к следующим этапам. Палитра временная, согласованная пользователем.

## Сборка и ассеты

- Реально выполнен зафиксированный glb-buildings-skill CLI 0.4.0 через assets:massing; ground/body/crown output использован в моделях. [Massing report](research/massing-report.json): 10 012 B, 48 triangles, 0 errors / 1 warning для исходной массы. Generator требует Node 24 и не входит в runtime.
- assets:build → assets:optimize → assets:inspect: PASS. Все 8 production GLB имеют 0 errors / 0 warnings. EXT_meshopt_compression validator отмечает как unsupported informational; дополнительно выполнены Meshopt decoded readback, bounds/UV checks и реальная загрузка browser useGLTF. UV намеренно сохранены для runtime материалов.
- Четыре этажа: Structure / Glass / WindowLights; 3 × 0.82 × 2.65, tolerance inspection 0.015. Отдельный floor 34–40 KB против бюджета <250 KB. Все GLB 328 732 bytes. [Полный report](research/assets-report.json).
- Повторная сборка всех моделей дала те же размеры; cached input mass и pinned source commits сохранены. public/asset-manifest.json содержит SHA-256 моделей, карт, HDR/font.
- Проверены отдельные Kenney City Commercial 2.1 / Holiday 2.0 licenses и official CC0 pack pages. Poly Haven — media CC0; website code не включён. Inter subset переименован Ida Digits, OFL notice в distribution. [THIRD_PARTY](../THIRD_PARTY.md).
- PBR maps 512px WebP; HDR 1K; original light mask 64px; всё art содержимое ~1.59 MB без JS/audio. Raw sources не включены в dist.
- Strict TypeScript: PASS. Vitest: **29/29**, 5 files. Добавлен существенный regression test: quantized Int16 → Float32 перед instancing сохраняет позиции ±1.5 m и не меняет cached source.
- Production build: PASS, 1178 modules. Entry ~410 KB / 130 KB gzip, SDK ~90 KB / 27 KB gzip, lazy 3D ~3.30 MB / 1.13 MB gzip; CSS ~11.5 KB. Development UI strings отсутствуют в dist assets.

## Browser / WebGL

Проверялся настоящий WebGL/Canvas + Rapier WASM в Codex Browser. Видимые dev-кнопки задают releaseX, запускают физический drop и ждут контакта. Store/React/physics не менялись через browser evaluation. DOM evaluation использовалась только для чтения UI и layout.

| Сценарий | Результат |
| --- | --- |
| Полные проходы 27 этажей в high | PASS: все A/B/C и special 9/18/27; roof/Text3D загружаются, celebration, input закрыт |
| Полная повторная партия в low | PASS: 27 этажей; один промах и один success со смещением; башня сохранена, replay доступен |
| Промах / повтор / смещение | PASS: промах не удаляет поставленные этажи; обычная посадка сохраняет offset |
| Три возврата на старт во время falling | PASS: новые партии остаются на 0, старые события не добавляют этажи |
| Physics bodies | 1 fixed в ожидании/финале, максимум 2 при падении |
| Renderer resources в high | После загрузки города/special 54 geometries / 8 textures на 12/13 этажах; 59 / 8 с roof/Text3D; replay 58 / 8. Загрузка cached roof geometry ожидаема, Text3D geometry удаляется |
| Renderer resources в low | 48 / 4 в финале; replay и три ранних сброса 47 / 4. HDR/теней нет, DPR=1, 60 snow particles |
| Draw calls | Около 34–40 при игре, 50 в общем виде после 27 этажей. Обычные фасады/все окна инстансированы, special использует shared geometry |
| Console чистой final dev вкладки | Нет errors; остаётся upstream Rapier WASM initialization deprecation warning |
| Production 4173 | PASS: GLB/environment загрузились, dev-панели нет. Space запустил физический промах, Enter установил первый этаж, pointer установил второй; дальше input остаётся доступен. Console errors нет |

При проверке найден и исправлен дефект instancing quantized geometry: после transform координаты >1 m нельзя записывать обратно в normalized Int16. Также context фасадных частей вынесен из компонента в отдельный стабильный module для Fast Refresh. Настоящая финальная вкладка после полного прохода не содержит errors.

Completion проверен на 320×568, 375×667, 390×844, 393×852, 430×932, 1280×720. Overflow отсутствует; CTA целиком внутри viewport. [DOM measurements](research/stage-3-viewports.json); screenshots/stage-3-complete-*.png. Игровые кадры: stage-3-preview.png (12 этажей), stage-3-low-floor-13.png; отдельный low completion сохранён.

## Практические границы проверки

Это функциональная проверка и renderer counters, а не FPS benchmark/полный GPU memory профиль. 50–60 FPS на телефонах и реальный Telegram iOS/Android ещё требуется измерить на этапе выпуска. Reduced motion предусмотрен (static snow, без camera/light impulses); OS preference в этой проверке не переключался. Звук/haptics и lifecycle покрыты существующими тестами, но real-device audio/haptic QA остаётся.

Vite предупреждает о >500 KB chunk из-за Three/Rapier WASM. Разделение/загрузка перед выпуском остаются задачей этапа 6. Крыша и 2027 уже готовы как assets; временная шкала, Bloom, confetti и поздравление пока не реализованы и не выдаются за готовые функции.
