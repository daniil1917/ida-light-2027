# Проверка этапа 1

Дата: 28.09.2026. Среда: Node 24.19.0; Vite 7.3.6; React 19.3.0; Fiber 9.8.1; Drei 10.7.9; React Three Rapier 2.2.0; tma.js/sdk 3.3.0. Точные зависимости — package-lock.json.

## Автоматические проверки

- TypeScript strict typecheck: PASS.
- Vitest: **17 / 17 PASS**, 2 test files.
- Production build: PASS, 1156 modules. Нет circular-chunk warning после удаления ручного разделения общих зависимостей.
- Production JavaScript не содержит debug controls «Настройки разработки» / «Коллайдеры Rapier»; browser DOM также их не содержит.

## Browser integration

Codex in-app Browser, настоящий WebGL Canvas и Rapier WASM:

| Действие | Результат |
| --- | --- |
| Start → первый tutorial | Появился hint; счётчик 0 / 27 |
| Dev «Точно» → физическое падение | swinging → falling → установлен 1-й этаж; tutorial исчез |
| Dev «Со смещением» → физическое падение | 2-й этаж установлен, смещение сохранилось |
| Dev «Промах» → физическое падение | Осталось 2 этажа; mistakes=1; вернулся swinging |
| Амплитуда 0 через видимый slider, обычный pointer click по сцене | Установлен 3-й этаж; «Точно на месте» |
| Space по игровой области | Установлен 4-й этаж |
| Enter по игровой области | Установлен 5-й этаж, checkpoint; input перестал строить |
| «Построить ещё раз» | 0 этажей, игра снова доступна; tutorial не повторяется |
| Production preview | Intro и Canvas работают; debug отсутствует; keyboard release работает |

Dev-кнопки изменяют только позицию release; до результата проходит настоящий physics drop. Этажи не добавлялись напрямую.

## Responsive

Проверены intro и игровой HUD. У всех размеров: нет горизонтального overflow, CTA целиком в viewport, счётчик и нижняя подпись находятся внутри экрана. PNG сохранены в `docs/screenshots/`.

| Viewport | Intro | Game HUD |
| --- | --- | --- |
| 320×568 | PASS | PASS |
| 375×667 | PASS | PASS |
| 390×844 | PASS | PASS |
| 393×852 | PASS | PASS |
| 430×932 | PASS | PASS |
| 1280×720 desktop | Игровая область центрирована, ширина 600 px | PASS при проверке механики |

Визуально просмотрены минимальный intro и игровая сцена, устранено пересечение CTA с основанием и прямоугольный фон ограниченного intro Canvas. Камера использует ширину/высоту viewport и плавно следует за верхней опорой.

## Известные ограничения первого этапа

1. Только пять этажей и checkpoint. Нет полного прохождения 27 этажей, greeting, share, sound, haptic, финальных GLB и cinematic.
2. Vite сообщает о chunk >500 KB. Текущий 3D chunk: ~3.16 MB minified / ~1.08 MB gzip, включая встроенный Rapier WASM. Main: ~369 KB / ~118 KB gzip; Telegram SDK: ~90 KB / ~27 KB gzip; CSS: ~10.6 KB / ~3 KB gzip. Это не измерение network transfer без gzip; hosting должен включать compression.
3. Rapier dependency выдаёт один warning `using deprecated parameters for the initialization function`. Это внутренняя WASM initialization dependency; своих ошибок в console не обнаружено. Upstream исходники не патчились.
4. Mobile viewport emulation не доказывает FPS, touch поведение iOS/Android или работу Telegram safe area/back/lifecycle. Требуется HTTPS Mini App и реальные устройства.
5. Нет измеренной memory/GPU/FPS при 27 этажах. Бюджет и инстансинг проверяются с финальными assets.
6. Palette, meshes и wordmark первого этапа технические/временные. Это не утверждённый финальный бренд и арт.
