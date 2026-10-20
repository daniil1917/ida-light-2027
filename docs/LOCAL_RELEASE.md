# Локальная версия перед публикацией · 0.15.0

Это документ прежнего стенда. Для новой сцены 0.16.0 актуальные адреса и команды — в [WINTER_INTEGRATION.md](WINTER_INTEGRATION.md). `npm run preview:legacy` открывает сохранённую 0.15.0; обычный `npm run preview` теперь открывает 0.16.0 на 4183.

По запросу пользователя Telegram publication и фактическая отправка пока не выполняются. Игра, пожелания и локальное сохранение доступны без bot/hosting/backend. Production output: `dist/`. Сборка содержит собственные assets, distribution notices и отдельные late chunks.

## Проверить локально

```bash
npm install
npm run test
npm run typecheck
npm run build
npm run preview
```

Открыть http://127.0.0.1:4173. Dev: `npm run dev` → http://127.0.0.1:5173. Кнопки dev-панели позволяют проверить настоящий физический проход, варианты пожеланий, low/static, pause и replay. Production dev-панель не содержит.

## Конфигурация будущей публикации

1. Выбрать HTTPS hosting для статического `dist/`; приложение использует пути от корня origin.
2. Включить gzip/Brotli для JS/CSS/JSON, immutable cache для `assets/*` с hash в имени; index.html обновлять без длительного cache. Модели/текстуры без filename hash обновлять с revalidation либо менять URL при новой кампании.
3. Создать/настроить Telegram bot и Mini App short name через BotFather. Поставить HTTPS URL в menu/Main Mini App.
4. Скопировать `.env.example` в `.env`, заполнить `VITE_TELEGRAM_APP_URL=https://t.me/BOT_USERNAME/APP_SHORT_NAME`, повторить build. Bot token во frontend не нужен.
5. Открыть Mini App на реальных Telegram iOS/Android/Desktop: загрузка, safe areas, back, фон/возврат, звук после gesture, mute, haptics, 20 этажей, replay, текстовое sharing по нажатию. Замерить FPS на современном и слабом телефонах; browser viewport QA не заменяет эти измерения.
6. Проверить фирменную композицию с заказчиком на устройствах. Палитра и Euclid Circular A уже заданы пользователем; результат текущей локальной проверки — design/revision-0.15.0/VERIFICATION.md.

Сейчас публичный адрес не задан. Окно «Поделиться пожеланием» предлагает копирование текста и PNG 1080×1350. После задания адреса добавляется «Поделиться»: Telegram chooser или Web Share, clipboard/manual fallback. Никакой отправки после победы или открытия окна нет. URL localhost/частной сети и launch data не включаются в результат.

PNG сохраняется обычным browser download; поведение сохранения внутри конкретных Telegram WebView нужно проверить на этапе публикации. Основной Telegram flow использует текст + ссылку и не требует image backend. Будущее media sharing можно подключить к отдельному payload/export модулю через prepared inline messages без изменения gameplay.

## Повторяемая сборка и лицензии

- package-lock.json фиксирует зависимости; Node.js 24 LTS рекомендуется.
- `assets:inspect`: 10 GLB, bounds/collider compatibility, glTF validation, SHA-256.
- `scripts/runtime-notices.mjs`: лицензии реально включённых в production пакетов; отсутствие notice блокирует build.
- `scripts/fetch-runtime-notices.py`: повторное получение LICENSE/README/archive metadata для npm-пакетов, в которых notice отсутствует. Network нужен только при повторном получении; текущие notices уже локальные.
- `dist/RUNTIME_NOTICES.txt`, `dist/ASSET_NOTICES.md`, `dist/licenses/`, `dist/fonts/Euclid-NOTICE.txt` следует сохранить вместе со сборкой.
- Known noncritical diagnostics: большой lazy Three/Rapier chunk и upstream Rapier WASM init deprecation. Renderer/physics libraries не патчились.

Полный код и документы остаются в рабочей папке. Локальный ZIP готовой сборки находится в `releases/` (не входит в Git); он не публикуется автоматически.

0.7.2: исправлены пересечение этажей с мачтой и выход тележки за стрелу. Проверки обеих серий до 20 этажей и промаха у границы — design/revision-0.7.2/CRANE_VERIFICATION.md.

0.8.0: телескопическая стрела, исходное падение без ограничений площадки, три жизни с автоматическим новым раундом, чередование подачи и праздничный фон/фасады. Проверки — design/revision-0.8.0/VERIFICATION.md.

0.9.0: светлые материалы Kenney, вертикальное падение без притягивания, усложнение точности и темпа, компоненты Fluid Functionalism с Euclid и палитрой Ida. Проверки — design/revision-0.9.0/VERIFICATION.md.

0.9.1: нижняя стартовая кнопка без подписи, ёлки и дополнительный Holiday-декор, редактура всех UI-текстов без капслока. Проверки — design/revision-0.9.1/VERIFICATION.md.

0.10.0: первый зимний квартал по референсам, освещение Drei и светлые материалы, тёплые окна/гирлянды, простые новые детали окружения без Blender. Механики сохранены. Проверки — design/revision-0.10.0/VERIFICATION.md.

0.11.0: архитектурный объём, исправленная разметка кладки/стекла, baked AO, N8AO/SMAA, крыши и машины, тёплые комнаты и свет фонарей. Подробные проверки — design/revision-0.11.0/VERIFICATION.md.

0.12.0: приглушённая палитра по референсам, одинаковая архитектура всех 32 соседних домов, облегчённый pipeline и более чувствительная адаптация качества. Проверки — design/revision-0.12.0/VERIFICATION.md.

0.12.1: постоянные GPU-буферы уложенных этажей, отдельный обычный mesh для движущегося этажа, единое время движения каретки/этажа, подготовка всех типов этажей и крыши при загрузке, плавная адаптация камеры при появлении пожелания. Проверки — design/revision-0.12.1/VERIFICATION.md.

0.13.0: Cycles lightmap квартала, один материал вместо динамического освещения окружения; детальность и тени сохраняются во всех режимах качества, автоматическое восстановление качества после стабильной работы. Устранены совпадающие плоскости бетона и снега в этажах. Редактируемая сцена Blender и pipeline находятся в assets/baked/ и scripts/. Проверки — design/revision-0.13.0/VERIFICATION.md.

0.14.0: перевес верхних этажей относительно опоры, физическое опрокидывание и новый раунд. Прочие механики и визуальные ассеты сохранены. Проверки — design/revision-0.14.0/VERIFICATION.md.

0.15.0: более медленная подача, запас устойчивости каркаса и индикатор неустойчивости с подсказкой направления. Проверки — design/revision-0.15.0/VERIFICATION.md.
