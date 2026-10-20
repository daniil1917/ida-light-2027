# Архитектура игрового цикла

Поток состояний приложения: `loading → intro → tutorial → playing → celebration → greeting` после 20 установленных этажей и завершения cinematic; `error` завершает проблемную загрузку/потерю контекста. В celebration input не сбрасывает этажи; replay начинает новую session.

Поток активного этажа: `swinging → falling → perfect / success / fail → swinging`. Создание и освобождение физического тела оформлены жизненным циклом React-компонента. После release body динамический, после успешного контакта удаляется. Положения установленных этажей сохраняет Zustand.

Пока этаж висит, движение вычисляется в useFrame; кран и трос используют ту же функцию swing. После release позиция фиксируется командой store и передаётся в динамический Rapier RigidBody. Хранять положение каждого кадра в React/store не требуется.

`difficulty.ts` задаёт шесть диапазонов. Небольшая помощь рассчитывается при release и задаёт начальную горизонтальную скорость физического тела; время падения остаётся результатом gravity. Полные промахи не притягиваются. С каждым retry помощь немного растёт, максимум 0.5; успешная посадка сбрасывает retryCount. Perfect snap выполняется только после реального физического результата.

Collision проверяется в единой чистой функции. Физический contact с верхней опорой вызывает success/perfect/fail. При полном промахе contact отсутствует: после пересечения плоскости установки отправляется fail. При неудачном overlap верхний collider отключается, чтобы дать блоку упасть, а не удерживать его на краю.

Единственный fixed collider опоры перемещается на новый верхний этаж. Число физических тел не растёт с башней: один collider опоры и одно динамическое тело при падении.

Задержка появления следующего этажа принадлежит React effect и отменяется при unmount/reset. Каждое событие содержит `attemptId`; store игнорирует устаревшие и повторные события. Каждая новая игра увеличивает sessionId.

Конфиги: gameConfig — размеры, gravity, пороги и задержки; visualConfig — camera; IdaMaterials — единые PBR-материалы; performanceConfig — DPR, тени и класс качества. Изменяемые dev-настройки отделены от gameplay state и видны только в development.

Три обычных типа фасада используют общий набор Drei Merged, окна — createInstances. Специальные этажи 7/14/20 используют shared GLTF geometry. Все модели оптимизированы Meshopt: перед instancing позиции и normals переводятся из quantized integer в Float32 и получают node world transform; это сохраняет размеры collider. Сохранённые floors хранят только позиции, не физические тела. Instancing ограничивает draw calls; WindowLights отделены и включаются детерминированно по прогрессу. Камера плавно следует за опорой и после завершения отъезжает до общего вида. Небольшие camera/light impulses отключены при reduced motion.

AudioProvider подписан на семантические переходы store, подписка очищается при unmount. AudioManager создаёт два Howl только при пользовательском interaction, переиспользует их при replay, не очередит ещё не загруженные эффекты. Sound preference необязателен (localStorage может быть недоступен). Pause останавливает feedback и приостанавливает ambient; возврат возобновляет тот же player. Telegram haptics вызываются guarded SDK API и проверяют sessionId; браузер не имитирует вибрацию.

TelegramProvider подключает TypeScript SDK из проверенного tma.js репозитория, получает user/viewport, подписывается на изменения viewport/safe area, настраивает back button, очищает собственные подписки. SDK singletons живут в течение приложения и не переинициализируются при replay. Browser fallback не требует Telegram.

Production assets локальные. Полный pipeline и лицензии описаны в ASSET_PIPELINE.md и THIRD_PARTY.md. Основная загрузка ждёт базу/обычные этажи/кран/PBR; город загружается после первого кадра, special предварительно с 6-го, roof/font с 17-го. Поздние assets имеют отдельный Suspense и не блокируют физику. Three DefaultLoadingManager сообщает реальный прогресс branded loading через лёгкий отдельный store.

Materials живут в scene provider, модели клонируют hierarchy и разделяют cached geometry. Instanced geometry и снег имеют явный dispose; cached useGLTF/useTexture assets сохраняются при replay, чтобы не повторять download/decode. Text3D geometry существует только при completion. Освещение нейтральное без HDR во всех режимах. В low mode нет теней, DPR=1, снег 60 частиц; high/medium 300/180. Reduced motion останавливает движение частиц.

Финальная presentation timeline описана в CELEBRATION.md. Clock хранит локальное animation time, store — только semantic phase/session. Game commands немедленно блокируют release в celebration. Camera/roof/windows/year/snow читают общий clock через useFrame; первый controller обновляет его до остальных scene callbacks. Lazy composer существует только в high/medium cinematic; renderer/tone mapping и targets восстанавливаются при exit. Confetti ограничен одним burst, async callback guarded session/state/pause и reset при replay.

Greeting открывается командой openGreeting(sessionId) только после 20 этажей, при текущей session и без pause. Clock не сбрасывается при celebration → greeting: крыша, окна, composer и burst продолжают тот же финал. Оба состояния входят в isFinalState. Replay/intro освобождают финальные ресурсы.

Greeting identity: FNV-1a от telegram:<user.id>:ida-2027 выбирает один из десяти неизменяемых campaign entries. Browser сохраняет greeting ID; при blocked storage выбор стабилен до закрытия приложения. Карточка — lazy DOM, Motion hero transition, Radix Dialog с focus trap/Escape/возвратом фокуса; внешние UI styles не копируются.

Sharing отделён от presentation: buildGreetingShare создаёт текст + проверенный публичный HTTPS URL без user/launch data; shareGreeting вызывается только кнопкой. Без URL доступны clipboard/manual text и оригинальная PNG-открытка. PNG строится отдельным Canvas2D, URL blob освобождается после download; WebGL framebuffer не читается.

AdaptiveQuality в production наблюдает устойчивую частоту кадров во время gameplay. Два трёхсекундных окна ниже 28 FPS снижают high → medium → low. Pause, resume gaps и низкий режим сбрасывают окно; обратного переключения и колебаний нет. Dev сохраняет ручной quality control. Build-time runtime-notices plugin включает точные лицензии пакетов, реально присутствующих в output chunks.
