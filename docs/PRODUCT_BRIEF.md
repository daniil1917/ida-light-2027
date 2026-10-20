# Задача

Нужно разработать полностью рабочую финальную версию браузерной 3D-игры для компании **Ида Лайт**, которая будет запускаться как **Telegram Mini App** и использоваться как новогоднее поздравление клиентов компании с 2027 годом.

Игра основана на механике Tower Bloxx / Tower Builder: пользователь по нажатию сбрасывает качающийся на кране этаж и постепенно собирает высотный дом.

Главная цель пользователя:

**построить 27 этажей → завершить здание → получить персональное новогоднее поздравление от Ида Лайт.**

Число 27 связано с наступлением **2027 года**.

Рабочее название:

**«Построй 2027»**

Проект должен сразу проектироваться как финальный продукт, а не как временный технический MVP.

---

# 1. Ключевой принцип разработки

Максимально использовать готовые открытые решения и ассеты с GitHub.

Не нужно заново писать:

- 3D-рендерер;
- физический движок;
- загрузчик GLB;
- систему камеры;
- управление состояниями;
- UI primitives;
- диалоги;
- анимационный движок;
- audio manager;
- confetti;
- Telegram Mini App SDK;
- оптимизацию glTF;
- базовые архитектурные 3D-модули;
- второстепенные городские 3D-объекты;
- новогодние props;
- HDRI;
- PBR-материалы;
- базовую кинематографическую систему.

При этом проект не должен выглядеть как asset flip.

Все используемые внешние решения должны быть приведены к единой визуальной системе **Ida Light Game 2027**.

---

# 2. Обязательный аудит GitHub-источников перед началом работы

Перед использованием каждого внешнего репозитория:

1. открыть актуальный README;
2. проверить LICENSE;
3. проверить, что репозиторий не архивирован;
4. проверить актуальную структуру;
5. определить, используется он как dependency, source reference, copied primitive или asset source;
6. не копировать код или ассеты, если лицензия не разрешает это однозначно;
7. создать файл:

`THIRD_PARTY.md`

В нем перечислить:

- repository;
- URL;
- license;
- что именно использовано;
- каким образом использовано;
- были ли изменены исходники.

Если лицензия не найдена или неоднозначна:

**не копировать код или ассеты. Использовать проект только как визуальный/архитектурный reference.**

---

# 3. Основной технический стек

Использовать:

## React + TypeScript + Vite

Vite:

https://github.com/vitejs/vite

Назначение:

- dev server;
- production build;
- asset bundling;
- code splitting;
- environment variables.

Проект должен быть TypeScript-first.

---

# 4. Главный 3D-движок

Использовать:

## React Three Fiber

https://github.com/pmndrs/react-three-fiber

R3F является основой всей 3D-сцены.

Использовать его для:

- WebGL canvas;
- камеры;
- renderer;
- 3D objects;
- игрового render loop;
- pointer/touch interaction;
- связи React state и Three.js.

Основная структура:

```text
<App>
    <TelegramProvider />

    <GameUI />

    <Canvas>
        <GameCamera />
        <Lighting />
        <Environment />

        <CityScene />

        <Tower />
        <Crane />
        <ActiveFloor />

        <Snow />

        <FinalEffects />
    </Canvas>
</App>
```

Не создавать отдельный собственный WebGL-engine.

---

# 5. Drei

Использовать:

https://github.com/pmndrs/drei

Из Drei использовать конкретно:

## useGLTF

Для загрузки:

```text
ida-base.glb
ida-floor-a.glb
ida-floor-b.glb
ida-floor-c.glb
ida-floor-special.glb
ida-roof.glb
ida-city.glb
ida-crane.glb
```

## Environment

Для освещения и отражений.

## ContactShadows / AccumulativeShadows

Только если они дают приемлемую производительность на мобильных устройствах.

## Points / Sparkles

Для 3D-снега.

## Text / Text3D

Для элементов, действительно являющихся частью 3D-сцены:

- 2027;
- возможный логотип/вывеска;
- архитектурные надписи.

Не использовать Text3D для обычного интерфейса.

UI должен оставаться DOM-based.

---

# 6. Физика

Использовать:

## React Three Rapier

https://github.com/pmndrs/react-three-rapier

Rapier нужен для:

- падения активного этажа;
- gravity;
- collision;
- визуального падения при промахе;
- небольшого вращения;
- физических fail-state.

При этом НЕ симулировать физически всю башню из 27 этажей.

Использовать гибридную модель.

---

# 7. Модель физики этажа

Состояния ActiveFloor:

```text
spawning
↓
swinging
↓
released
↓
falling
↓
collision
↓
perfect / success / fail
```

Пока этаж раскачивается:

**не использовать свободную Rapier-физику.**

Положение задается программно.

Например синусоидальным движением:

```text
x = center + sin(time * speed) * amplitude
```

После tap:

```text
swinging → released
```

затем:

```text
RigidBody dynamic
```

и этаж физически падает.

После успешного collision:

```text
dynamic → fixed
```

или физическое тело удаляется, а объект становится обычным static Three mesh.

Таким образом старые этажи практически не участвуют в физической симуляции.

---

# 8. Механика Tower Builder

Главный reference:

https://github.com/webxdc/tower-builder

ВАЖНО:

этот проект не должен становиться runtime dependency.

Не нужно переносить:

- cooljs;
- webxdc;
- старый webpack;
- Zepto;
- старый UI;
- старые assets;
- highscore;
- оригинальный audio.

Использовать repository только как reference механики.

Особенно изучить:

```text
src/block.js
src/utils.js
src/hook.js
src/constant.js
```

Из него нужно переиспользовать концептуально:

### State machine

```text
swing
drop
land
rotate
out
```

### Collision states

- miss;
- left overhang;
- right overhang;
- success;
- perfect.

### Perfect detection

Центральное попадание должно иметь отдельное состояние.

### Increasing difficulty

Сложность постепенно увеличивается в зависимости от числа этажей.

Но оригинальные значения сложности не копировать вслепую.

---

# 9. Новая система определения попадания

После collision вычислять горизонтальное пересечение текущего этажа и предыдущего.

Условно:

```text
overlap = intersectionWidth / floorWidth
```

Предлагаемая логика:

```text
overlap >= 0.90
→ PERFECT

overlap >= 0.45
→ SUCCESS

overlap < 0.45
→ FAIL
```

Конкретные значения вынести в:

`gameConfig.ts`

Чтобы их можно было быстро менять.

---

# 10. Perfect

Perfect является приятным feedback, а не обязательным условием прохождения.

При Perfect:

- короткий UI badge;
- subtle scale pulse здания;
- отдельный sound;
- light Telegram haptic;
- небольшой glow;
- возможно несколько дополнительных снежных частиц.

Не делать:

- огромных combo counters;
- arcade numbers;
- x5;
- +500;
- золотых медалей.

Игра должна оставаться визуально премиальной.

---

# 11. Условие победы

Основная цель:

```text
TARGET_FLOORS = 27
```

После:

```text
successCount === 27
```

обычный игровой цикл должен остановиться.

Запустить:

```text
GAME_COMPLETE
```

Дальше начинается отдельная cinematic sequence.

---

# 12. Game state

Использовать:

## Zustand

https://github.com/pmndrs/zustand

Создать единый store:

```ts
type GameState =
  | 'loading'
  | 'intro'
  | 'tutorial'
  | 'playing'
  | 'checkpoint'
  | 'celebration'
  | 'greeting'
  | 'error'
```

Хранить:

```text
state

currentFloor
targetFloors

mistakes

perfectCount
consecutivePerfects

difficultyLevel

soundEnabled

hasSeenTutorial

greetingId

telegramUser

performanceMode
```

Three.js-сцена не должна быть источником истины для состояния приложения.

---

# 13. Сложность

Игра является корпоративным поздравлением, а не hardcore game.

Не допустить ситуацию, при которой значительная часть пользователей никогда не увидит поздравление.

Рекомендуемая прогрессия:

## Этажи 1–5

Очень легко.

Пользователь учится.

## 6–10

Немного увеличивается скорость.

## 11–17

Увеличивается амплитуда движения.

## 18–23

Ещё немного быстрее.

## 24–26

Самый сложный участок.

## 27

Финальный этаж.

Немного проще 24–26.

Финал должен ощущаться как кульминация, а не ловушка.

Вынести всё в:

`difficulty.ts`

Например:

```ts
getSwingSpeed(floor)
getSwingAmplitude(floor)
getDropAssist(floor)
getPerfectTolerance(floor)
```

---

# 14. Ошибки

Не использовать исходное:

```text
3 жизни → Game Over
```

Игра должна позволять человеку пройти её.

После промаха:

1. этаж физически падает;
2. камера слегка реагирует;
3. появляется короткий feedback;
4. спустя примерно 600–900 мс появляется новый этаж;
5. пользователь продолжает.

Можно хранить mistakes только для аналитики.

Не показывать огромный счетчик жизней.

---

# 15. Tutorial

Первый этаж является tutorial.

UI:

```text
Нажмите, чтобы установить этаж
```

Можно использовать небольшую touch-анимацию.

После первого tap tutorial исчезает и больше не мешает.

Не создавать отдельный пятиэкранный onboarding.

---

# 16. Основной UI

UI должен быть минимальным.

Во время игры одновременно видны максимум:

```text
27 / 27
```

или:

```text
17 / 27 этажей
```

и:

- sound toggle;
- краткий feedback Perfect/Fail.

Не использовать:

- score;
- coins;
- leaderboards;
- timer;
- achievements;
- sidebar;
- unnecessary menus.

---

# 17. UI primitives

Использовать:

## Radix Primitives

https://github.com/radix-ui/primitives

и:

## shadcn/ui

https://github.com/shadcn-ui/ui

Использовать только как технические primitives.

Например:

- Button;
- Dialog;
- Progress;
- Slot;
- Tooltip;
- accessible focus management.

НЕ использовать готовый внешний вид shadcn.

Все visual styles переписать.

---

# 18. Цветовая система

Использовать:

## Radix Colors

https://github.com/radix-ui/colors

Использовать структуру tonal scale и accessibility logic.

Но primary brand color должен быть цветом Ида Лайт.

Создать tokens:

```text
--ida-accent
--ida-accent-hover
--ida-accent-active

--ida-bg
--ida-surface
--ida-surface-glass

--ida-text-primary
--ida-text-secondary

--ida-success
--ida-warning
```

Если точный brand color пока не передан:

создать отдельный CSS variable placeholder.

Не зашивать случайный цвет глубоко в компоненты.

---

# 19. UI-анимации

Использовать:

## Motion

https://github.com/motiondivision/motion

Дополнительно исследовать:

## Motion Primitives

https://github.com/ibelick/motion-primitives

Не обязательно устанавливать Motion Primitives целиком.

Можно копировать только нужные primitives, если это разрешает актуальная лицензия.

Особенно интересны:

- animated text;
- morphing dialog;
- transition panel;
- animated number;
- disclosure;
- animated button feedback.

---

# 20. Game UI Kit

Создать внутри проекта:

```text
src/ui/ida/
```

Компоненты:

```text
IdaButton

FloorCounter

PerfectBadge

FailBadge

TutorialHint

SoundToggle

GameProgress

GreetingCard

LoadingScreen

ErrorScreen

UnsupportedDevice

IntroScreen
```

UI должен выглядеть единообразно.

---

# 21. Визуальный стиль

Главный арт-дирекшн:

**premium architectural 3D diorama**

Не:

- cartoon;
- hyper-casual;
- low-poly game;
- Roblox;
- mobile RPG;
- casino;
- детская игра.

Характер:

- аккуратная архитектурная пластика;
- мягкие bevel;
- сдержанный premium 3D;
- стекло;
- матовый металл;
- окрашенный бетон;
- минимализм;
- современная девелоперская эстетика;
- праздничность через свет и атмосферу, а не через сотню ёлок.

---

# 22. Генерация дома

Исследовать и использовать как build-time инструмент:

## glb-buildings-skill

https://github.com/hec-ovi/glb-buildings-skill

Не делать его runtime dependency.

Использовать для создания базовой архитектурной массы здания.

Дом должен состоять из отдельных секций:

```text
base

floor_a
floor_b
floor_c

floor_special

crown
roof
```

Главное требование:

игровой этаж должен существовать как независимый 3D object/GLB node.

---

# 23. Структура здания

Не моделировать 27 совершенно разных этажей.

Использовать небольшой набор модулей:

```text
BASE

A
B
A
C
B
A
A
C
...

SPECIAL

ROOF
```

Создать примерно:

```text
ida-base.glb

ida-floor-a.glb
ida-floor-b.glb
ida-floor-c.glb

ida-floor-special.glb

ida-roof.glb
```

И повторять их по паттерну.

---

# 24. GitHub-библиотека архитектурных ассетов

Использовать:

https://github.com/shorepine/kenney

Особенно исследовать пакеты:

```text
Building Kit
Modular Buildings
City Kit - Commercial
City Kit - Industrial
City Kit - Roads
City Kit - Suburban
Holiday Kit
Nature Kit
```

Не использовать готовый Kenney art style как финальный стиль.

Использовать ассеты как исходную геометрию.

Pipeline:

```text
Kenney geometry
↓
remove original materials where appropriate
↓
normalize scale
↓
apply Ida materials
↓
optimize
↓
export GLB
```

---

# 25. Фоновые здания

Фоновые buildings могут быть собраны из:

```text
Kenney Modular Buildings
Kenney City Commercial
Kenney City Suburban
```

Они:

- находятся далеко от камеры;
- имеют упрощенную геометрию;
- используют единую Ida material palette;
- не конкурируют с главным домом.

Не делать большой настоящий город.

Нужна камерная архитектурная диорама.

---

# 26. Новогодний декор

Использовать Holiday Kit.

GitHub-каталог:

https://github.com/series-ai/jam-ready-assets

Или проверенный источник Kenney.

Использовать умеренно:

- одна центральная ёлка;
- несколько gift boxes;
- небольшие праздничные props;
- архитектурная подсветка.

Не превращать сцену в рождественский рынок.

---

# 27. Материалы и HDRI

Использовать:

## Poly Haven

https://github.com/Poly-Haven/polyhaven.com

И публичные CC0 assets Poly Haven.

Можно использовать:

- HDRI;
- concrete PBR;
- snow;
- glass-related environment;
- metal;
- surface textures.

Дополнительно исследовать:

https://github.com/pmndrs/assets

ВАЖНО:

у pmndrs/assets проверять происхождение и лицензию конкретного asset.

Не считать автоматически, что весь repository имеет одну лицензию.

---

# 28. Material system

Создать:

```text
IdaFacadeMaterial

IdaGlassMaterial

IdaMetalMaterial

IdaSnowMaterial

IdaLightMaterial

IdaGroundMaterial
```

Пример визуальной системы:

## Facade

Светлый матовый архитектурный материал.

## Glass

Темное слегка отражающее стекло.

## Metal

Темный графит.

## Light

Теплый emissive.

## 2027

Светящийся accent/white material.

---

# 29. Окна

Window lights должны быть отдельным mesh/material group.

Например:

```text
Floor
├ Structure
├ Glass
└ WindowLights
```

Это позволит анимировать освещение.

Progress:

```text
0–5 floors
~10% windows

6–10
~25%

11–17
~45%

18–23
~70%

24–26
~85%

27
100%
```

Точный процент может быть рандомизирован.

---

# 30. 3D «2027»

Использовать:

## Drei Text3D

и open-source font.

Можно использовать:

## Inter

https://github.com/rsms/inter

Если визуально подходит.

Если у Ида Лайт есть используемый open-source corporate font:

предпочесть его.

Создать настоящий 3D mesh:

```text
2027
```

Материал:

```text
emissive
```

В финале использовать Bloom.

---

# 31. Кран

В качестве GitHub/reference источника исследовать:

https://github.com/fczuardi/construction-game

В repository есть construction-themed assets/scenes.

До копирования конкретного crane asset обязательно проверить:

- происхождение;
- исходную лицензию;
- LICENSE.

Если crane нельзя безопасно переиспользовать:

использовать Kenney / другой CC0 construction asset.

Кран должен быть второстепенным.

В игре пользователь в основном видит:

```text
верх стрелы
трос
подвешенный этаж
```

Не нужен детализированный tower crane на 100k polygons.

---

# 32. Камера

Основная камера:

предпочтительно OrthographicCamera либо очень мягкая PerspectiveCamera с большим focal length.

Не использовать сильную перспективу.

Главный визуальный эффект:

**архитектурная миниатюра / diorama.**

Камера большую часть игры статична.

Башня растет вверх, поэтому после определенного количества этажей:

```text
cameraTargetY
```

плавно смещается вверх.

Не должно быть рывков.

---

# 33. Reference stacking game

Изучить:

https://github.com/artginzburg/stack

Только как reference, если лицензия явно не разрешает копирование.

Интересуют:

- mobile input;
- responsive camera;
- orthographic framing;
- stacking game composition;
- clipping/cut mechanics;
- vertical progression.

Не копировать код без подтвержденной лицензии.

---

# 34. Reference архитектуры 3D-игры

Изучить:

## pmndrs/racing-game

https://github.com/pmndrs/racing-game

Использовать как reference структуры современного R3F game project.

Нас интересует разделение:

```text
scene
models
effects
ui
state
assets
```

Не переносить игровую механику racing game.

Использовать только architectural patterns, которые подходят нашему проекту.

---

# 35. Снег

Постоянный снег делать внутри Three.js.

Предпочтительно:

```text
Drei Points
```

или другой легкий instanced particle approach.

Три depth layers:

```text
far snow

mid snow

foreground flakes
```

Снег не должен сильно закрывать башню.

На слабых устройствах:

уменьшить particle count.

---

# 36. Performance mode

Определять approximate device capability.

Создать:

```text
high
medium
low
```

Например:

## High

- full snow;
- shadows;
- bloom;
- DPR <= 2.

## Medium

- меньше snow;
- simpler shadows;
- DPR <= 1.5.

## Low

- минимальный snow;
- no expensive shadow;
- minimal postprocessing;
- DPR = 1.

Не пытаться автоматически использовать максимальное DPR устройства.

---

# 37. Postprocessing

Использовать:

https://github.com/pmndrs/react-postprocessing

Использовать минимально.

Разрешены:

## Bloom

Для:

- 2027;
- окон;
- отдельных праздничных источников света.

## Vignette

Очень мягко только в финале.

Не использовать без необходимости:

- heavy DOF;
- chromatic aberration;
- glitch;
- distortion;
- film grain;
- SSAO высокой стоимости.

---

# 38. Confetti

Использовать:

https://github.com/catdad/canvas-confetti

Только в момент завершения.

Не использовать как постоянный эффект.

Поток:

```text
27 floor success
↓
cinematic starts
↓
2027 lights up
↓
short confetti burst
```

---

# 39. Audio

Использовать:

## Howler.js

https://github.com/goldfire/howler.js

Нужные звуки:

```text
ui-tap
floor-release
floor-impact
perfect
fail
roof
lights-on
celebration
```

Также:

```text
background ambient/music
```

Музыка должна быть спокойной, современной, festive, но не «Jingle Bells в лифте».

Audio asset также должен иметь подходящую open license.

Не использовать музыку исходного Tower Builder.

---

# 40. Telegram Mini App

Использовать:

## tma.js

https://github.com/Telegram-Mini-Apps/tma.js

Параллельно сверяться с официальной Telegram Mini Apps документацией.

Использовать:

- initData;
- user;
- viewport;
- safe area;
- theme;
- hapticFeedback;
- back button;
- lifecycle.

---

# 41. Telegram Haptic Feedback

Использовать haptic осторожно.

## floor released

не нужен.

## normal success

очень легкий.

## perfect

light impact.

## fail

неприятный, но слабый feedback.

## completion

success notification.

Не вибрировать на каждом кадре или каждом UI tap.

---

# 42. Telegram viewport

Игра должна корректно работать:

- iOS Telegram;
- Android Telegram;
- Telegram Desktop/Web, если WebGL доступен.

Учитывать:

- safe-area-top;
- safe-area-bottom;
- Telegram expanded viewport;
- изменение viewport height;
- ориентацию устройства.

Основной target:

**portrait smartphone.**

---

# 43. Desktop

На desktop игру центрировать.

Максимальный игровой viewport:

примерно:

```text
480–600px width
```

3D canvas можно оставить full screen, но композиция должна сохранять mobile framing.

---

# 44. Intro

После загрузки:

показать красивую 3D-сцену будущей башни/города без завершенного здания.

UI:

```text
Построй 2027

Собери дом из 27 этажей
и открой своё пожелание
на новый год.
```

CTA:

```text
Начать строительство
```

Не перегружать intro.

---

# 45. Tutorial → Playing

После CTA:

камера приходит в начальное положение.

Появляется первый этаж.

Hint:

```text
Нажмите, чтобы установить этаж
```

После первого успешного tap:

hint исчезает.

---

# 46. Visual progression

Игра должна визуально изменяться по мере строительства.

## 0–5

- холодный вечер;
- минимум окон;
- слабый снег.

## 6–10

- начинает появляться теплый свет;
- снег чуть заметнее.

## 11–17

- темнее sky/environment;
- больше окон;
- появляются отдельные festive lights.

## 18–23

- город заметно оживает;
- увеличивается warm/cold contrast.

## 24–26

- почти финальная night scene;
- праздничное ожидание.

## 27

- culmination.

---

# 47. Final cinematic

Исследовать как reference:

## CinematicIntros-JSX

https://github.com/MushroomFleet/CinematicIntros-JSX

До копирования конкретного кода проверить LICENSE.

Нас интересуют концепты:

- camera path;
- orbit;
- hero reveal;
- easing;
- chained sequence.

Финальная последовательность:

```text
T = 0
27-й этаж успешно установлен

T = 0.2
блокировать input

T = 0.4
камера начинает отъезжать

T = 0.8
башня становится полностью видимой

T = 1.1
появляется/опускается roof/crown

T = 1.4
начинается последовательное включение окон снизу вверх

T = 2.0
загорается надпись 2027

T = 2.2
Bloom увеличивается

T = 2.4
снег немного усиливается

T = 2.7
confetti burst

T = 3.2
Greeting Card
```

Все значения вынести в config.

---

# 48. Greeting Card

После завершения пользователь получает:

```text
Ваше пожелание на 2027
```

и один из вариантов поздравления.

Например категории:

```text
growth
ideas
team
projects
partnership
stability
boldness
calm
success
```

Создать 8–12 поздравлений.

Они должны быть:

- короткими;
- профессиональными;
- теплыми;
- не похожими на гороскоп;
- связанными с развитием, проектами, командой и новым годом.

---

# 49. Стабильное случайное поздравление

Не использовать просто:

```text
Math.random()
```

при каждом запуске.

Пользователь должен при повторном прохождении получать то же пожелание.

Если есть Telegram user id:

создать deterministic index.

Например:

```text
hash(user.id + campaignId) % greetings.length
```

Это не security logic, поэтому frontend deterministic hash допустим.

Campaign ID:

```text
ida-2027
```

Если Telegram user отсутствует:

fallback localStorage.

---

# 50. Greeting animation

Исследовать Motion Primitives.

Greeting Card должна появляться не как обычная внезапная modal.

Желательно сделать morph transition.

Например:

```text
3D 2027
↓
small UI 2027 badge
↓
expands
↓
Greeting Card
```

Либо плавный hero transition.

---

# 51. Greeting UI

Пример:

```text
┌────────────────────────────┐
│                            │
│            2027            │
│                            │
│     Ваше пожелание         │
│       на новый год         │
│                            │
│  Пусть сильные идеи        │
│  быстрее превращаются      │
│  в сильные проекты.        │
│                            │
│         Ида Лайт           │
│                            │
│   [ Поделиться ]           │
│                            │
└────────────────────────────┘
```

---

# 52. Повторная игра

Вторичная кнопка:

```text
Построить ещё раз
```

Но поздравление остается прежним.

---

# 53. Share

Реализовать максимально корректный Telegram share flow.

Не делать share автоматически.

Пользователь сам нажимает:

```text
Поделиться
```

Если полноценный screenshot/card sharing слишком сложно реализовать надежно:

сделать sharing текста + ссылки на Mini App.

Архитектуру предусмотреть для будущего sharing изображения.

---

# 54. Loading

3D-assets могут грузиться заметно.

Не показывать пустой экран.

Нужен branded Loading Screen.

Минимум:

```text
Ида Лайт

Строим...
```

и progress.

Использовать asset preloading.

---

# 55. Asset strategy

Разделить загрузку.

## Initial bundle

Только:

- base;
- 3 floor types;
- crane;
- essential textures;
- UI;
- essential audio.

## Lazy / later

- roof;
- celebration;
- greeting assets;
- extra background props;
- high-quality postprocessing assets.

---

# 56. glTF optimization

Использовать:

## glTF Transform

https://github.com/donmccurdy/glTF-Transform

Создать npm scripts:

```text
assets:optimize
assets:inspect
```

Использовать там, где подходит:

- dedup;
- prune;
- weld;
- resize;
- WebP;
- Meshopt;
- texture compression.

Никогда не класть сырой Blender export напрямую в production без проверки.

---

# 57. Performance budget

Цель:

стабильные:

```text
50–60 FPS
```

на современном смартфоне.

Допустимо:

```text
30+ FPS
```

на слабых устройствах.

Начальная загрузка должна быть максимально маленькой.

Ориентиры:

```text
individual floor GLB:
желательно < 250 KB

initial scene:
желательно несколько MB, не десятки MB

texture size:
512–1024 где возможно
```

Не использовать 4K textures без реальной необходимости.

---

# 58. Geometry

Использовать instancing, где объекты повторяются.

Например:

- фонари;
- деревья;
- некоторые окна;
- снег;
- одинаковые фоновые props.

Не создавать сотни отдельных draw calls без необходимости.

---

# 59. Shadows

Mobile-first.

Не ставить shadow casting на всё подряд.

Главный источник тени:

- активный этаж;
- башня;
- основные props.

Фоновые здания могут использовать baked/simple shading.

---

# 60. Camera shake

Можно использовать минимальный camera impulse:

## normal impact

1–2 px equivalent.

## fail

немного сильнее.

## perfect

shake не нужен.

Не превращать приложение в FPS.

---

# 61. Responsive

Проверить минимум:

```text
320x568
375x667
390x844
393x852
430x932
```

Также:

- iPhone safe areas;
- Android tall screens;
- Telegram bottom controls;
- Desktop.

---

# 62. Accessibility

Даже игровая Mini App должна иметь:

- достаточный contrast UI;
- доступные button labels;
- aria-label для icon buttons;
- reduced motion handling.

При:

```text
prefers-reduced-motion
```

уменьшать:

- camera orbit;
- UI morphing;
- confetti intensity.

---

# 63. Sound controls

Sound toggle должен быть всегда доступен.

Начальная музыка:

не запускать до пользовательского interaction, чтобы не конфликтовать с browser audio policies.

---

# 64. Не использовать

Не добавлять без необходимости:

- leaderboard;
- авторизацию отдельно от Telegram;
- coins;
- XP;
- shop;
- achievements;
- score;
- daily rewards;
- NFT;
- advertising;
- unnecessary backend;
- analytics SDK на первом этапе;
- Three UIkit;
- Theatre.js;
- Phaser;
- Babylon;
- Unity WebGL;
- heavy particle engines.

Не смешивать сразу несколько 3D-движков.

---

# 65. Структура проекта

Ориентироваться на:

```text
src/
│
├── app/
│   ├── App.tsx
│   └── config.ts
│
├── game/
│   ├── store.ts
│   ├── types.ts
│   ├── gameConfig.ts
│   ├── difficulty.ts
│   ├── collision.ts
│   ├── greetings.ts
│   └── progression.ts
│
├── scene/
│   ├── GameCanvas.tsx
│   ├── GameScene.tsx
│   ├── GameCamera.tsx
│   │
│   ├── tower/
│   │   ├── Tower.tsx
│   │   ├── Floor.tsx
│   │   ├── ActiveFloor.tsx
│   │   └── Roof.tsx
│   │
│   ├── Crane.tsx
│   ├── CityScene.tsx
│   ├── Snow.tsx
│   ├── Lighting.tsx
│   └── FinalSequence.tsx
│
├── physics/
│   ├── FloorPhysics.ts
│   └── collisionUtils.ts
│
├── ui/
│   ├── ida/
│   │   ├── IdaButton.tsx
│   │   ├── FloorCounter.tsx
│   │   ├── PerfectBadge.tsx
│   │   ├── TutorialHint.tsx
│   │   ├── GreetingCard.tsx
│   │   └── SoundToggle.tsx
│   │
│   ├── IntroScreen.tsx
│   ├── GameHUD.tsx
│   └── LoadingScreen.tsx
│
├── telegram/
│   ├── telegram.ts
│   ├── TelegramProvider.tsx
│   └── haptics.ts
│
├── audio/
│   ├── audioManager.ts
│   └── sounds.ts
│
├── effects/
│   ├── Celebration.tsx
│   └── PostProcessing.tsx
│
├── assets/
│   └── ...
│
└── styles/
    ├── tokens.css
    └── global.css
```

---

# 66. Конфиги

Все важные значения должны быть вынесены из компонентов.

Создать:

```text
gameConfig.ts
visualConfig.ts
performanceConfig.ts
```

Например:

```ts
export const GAME_CONFIG = {
  targetFloors: 27,
  perfectOverlap: 0.9,
  successOverlap: 0.45,
}
```

---

# 67. Dev tools

В development mode создать debug panel.

Можно через Leva или собственную debug-панель.

Настраивать:

```text
swingSpeed
amplitude
gravity
perfectTolerance
successTolerance
cameraY
cameraZoom
snowCount
bloomIntensity
```

В production debug UI не включать.

---

# 68. Первый технический этап

Перед красивой сценой собрать vertical slice:

```text
Telegram shell

+
R3F canvas

+
кран

+
один 3D этаж

+
swing

+
tap

+
Rapier drop

+
collision

+
success/fail

+
следующий этаж
```

Не начинать сразу с 27 этажей и праздничного финала.

Но vertical slice должен использовать тот же production stack.

---

# 69. Второй этап

После стабильной механики:

```text
27 floors
difficulty
camera tracking
visual progression
sound
haptic
```

---

# 70. Третий этап

После game loop:

```text
city
materials
snow
lighting
windows
2027
roof
```

---

# 71. Четвертый этап

Финальный cinematic:

```text
camera
roof
lights
2027
bloom
snow
confetti
```

---

# 72. Пятый этап

Greeting:

```text
deterministic greeting
card
motion
share
replay
```

---

# 73. Финальная оптимизация

Обязательно проверить:

## Memory

нет ли утечек при replay.

## GPU

нет ли слишком большого числа draw calls.

## Physics

старые floors не должны продолжать бессмысленно симулироваться.

## Textures

нет ли неоптимизированных изображений.

## GLB

все production GLB прогнаны через optimization.

## Telegram

safe-area.

## iOS

нет ли touch delay / scroll conflict.

---

# 74. Поведение страницы

Во время игры:

```text
overscroll: none
touch-action
user-select: none
```

Не допустить:

- случайного browser scroll;
- text selection;
- pull-to-refresh;
- zoom жестом;
- двойного tap zoom.

Но сделать это аккуратно только внутри игрового viewport.

---

# 75. Финальный критерий качества

Продукт должен восприниматься не как:

> «мы нашли Tower Bloxx на GitHub и поменяли картинки»

а как:

> «Ида Лайт выпустила небольшую собственную новогоднюю 3D-игру».

Переиспользование open source не должно визуально считываться.

---

# 76. Acceptance Criteria

Работа считается законченной, когда:

1. Telegram Mini App открывается без ошибок.
2. Игра работает на iOS и Android.
3. Пользователь понимает механику без инструкции.
4. Все 27 этажей можно построить.
5. Ошибка не заставляет начинать игру заново.
6. Difficulty плавно растет.
7. Perfect определяется корректно.
8. Камера плавно следует за башней.
9. Нет визуальных рывков.
10. Основные объекты являются настоящими 3D meshes.
11. Здание собрано из переиспользованных/open-source/build-time assets.
12. Все asset licenses документированы.
13. Окна постепенно загораются.
14. Снег работает без заметных лагов.
15. На 27 этаже запускается cinematic.
16. Появляется крыша/финальный crown.
17. Загорается `2027`.
18. Работает Bloom.
19. Работает confetti.
20. Показывается Greeting Card.
21. Пользователь получает стабильное для себя поздравление.
22. Есть replay.
23. Есть Telegram-friendly sharing.
24. Есть sound toggle.
25. Есть haptic feedback.
26. Игра адаптирована под safe areas.
27. На слабых устройствах включается упрощенный visual mode.
28. После replay нет memory leaks.
29. Все важные параметры находятся в config.
30. Production build проходит без errors/warnings критического уровня.

---

# 77. Очень важно: не делать огромный rewrite после каждого этапа

Разрабатывать архитектуру сразу так, чтобы:

```text
Game Logic
```

не зависела от:

```text
3D assets
```

а UI не зависел напрямую от physics engine.

Связь:

```text
Rapier
↓
game events
↓
Zustand
↓
Scene + UI
```

Например:

```text
FLOOR_RELEASED

FLOOR_PERFECT

FLOOR_SUCCESS

FLOOR_FAILED

FLOOR_ADDED

GAME_COMPLETED

CELEBRATION_COMPLETED

GREETING_OPENED
```

---

# 78. Главное ограничение

Если внешний GitHub-проект предоставляет сложную систему, из которой требуется только 5% функционала:

**не устанавливать всю систему без необходимости.**

Предпочтение:

```text
small reusable primitive
```

вместо:

```text
huge dependency
```

Особенно для:

- animations;
- particles;
- UI;
- camera helpers.

---

# 79. Визуальная и техническая цель

Итог должен сочетать:

```text
простоту Tower Bloxx

+

качество современной R3F-сцены

+

архитектурную эстетику Ида Лайт

+

новогоднюю атмосферу

+

ощущение короткого интерактивного подарка
```

Игра должна занимать примерно:

**1,5–3 минуты.**

Она не должна ощущаться как полноценная мобильная игра, которую пользователь обязан изучать.

Это интерактивное новогоднее поздравление.

---

# 80. Что сделать в первую очередь

Начни работу НЕ с написания всего приложения.

Сначала:

1. исследуй перечисленные GitHub-репозитории;
2. создай `THIRD_PARTY.md`;
3. зафиксируй, что реально можно переиспользовать;
4. создай итоговую архитектуру;
5. создай `IMPLEMENTATION_PLAN.md`;
6. перечисли этапы реализации;
7. только после этого начинай писать production code.

После исследования не останавливайся для подтверждения.

Самостоятельно переходи к реализации.

Если какой-либо указанный repository оказался устаревшим, несовместимым или имеет неподходящую лицензию:

найди открытый GitHub-аналог с подходящей лицензией, зафиксируй замену в `THIRD_PARTY.md` и продолжай.

Не заменяй R3F/Three.js на другой 3D-engine без веской технической причины.

---

# 81. Конечный результат

В результате должен существовать полностью рабочий repository с:

```text
production-ready Telegram Mini App

+
3D Tower game

+
27 этажей

+
Ida Light art direction

+
новогодняя progression

+
final cinematic

+
personal greeting

+
responsive mobile UI

+
documented open-source dependencies
```

Проект должен запускаться стандартно:

```bash
npm install
npm run dev
```

Production:

```bash
npm run build
```

В README обязательно описать:

- setup;
- dev;
- build;
- Telegram configuration;
- asset pipeline;
- optimization;
- third-party repositories;
- project architecture.

---

# Репозитории, которые обязательно исследовать

## Core

React Three Fiber  
https://github.com/pmndrs/react-three-fiber

Drei  
https://github.com/pmndrs/drei

React Three Rapier  
https://github.com/pmndrs/react-three-rapier

Zustand  
https://github.com/pmndrs/zustand

Vite  
https://github.com/vitejs/vite

---

## UI

Radix Primitives  
https://github.com/radix-ui/primitives

Radix Colors  
https://github.com/radix-ui/colors

shadcn/ui  
https://github.com/shadcn-ui/ui

Motion  
https://github.com/motiondivision/motion

Motion Primitives  
https://github.com/ibelick/motion-primitives

---

## Telegram

tma.js  
https://github.com/Telegram-Mini-Apps/tma.js

---

## Audio / FX

Howler.js  
https://github.com/goldfire/howler.js

React Postprocessing  
https://github.com/pmndrs/react-postprocessing

canvas-confetti  
https://github.com/catdad/canvas-confetti

---

## Assets / 3D

Kenney GitHub collection  
https://github.com/shorepine/kenney

Kenney City Builder  
https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0

Jam Ready Assets / Kenney Holiday  
https://github.com/series-ai/jam-ready-assets

Poly Haven  
https://github.com/Poly-Haven/polyhaven.com

pmndrs/assets  
https://github.com/pmndrs/assets

Inter  
https://github.com/rsms/inter

---

## Buildings

glb-buildings-skill  
https://github.com/hec-ovi/glb-buildings-skill

Использовать как build-time source/generator.

---

## References

Original Tower Builder  
https://github.com/webxdc/tower-builder

Использовать только для анализа mechanic/state machine.

pmndrs racing game  
https://github.com/pmndrs/racing-game

Использовать как reference архитектуры R3F game.

CinematicIntros JSX  
https://github.com/MushroomFleet/CinematicIntros-JSX

Использовать как reference cinematic camera system, если лицензия подходит.

Construction Game  
https://github.com/fczuardi/construction-game

Исследовать как источник construction-related assets и reference. Конкретные assets использовать только после проверки их исходных лицензий.

Stack  
https://github.com/artginzburg/stack

Использовать только как implementation reference до подтверждения лицензии.

---

# Принцип переиспользования

Не форкать всё подряд.

Использовать четыре режима:

## 1. Dependency

Для зрелых библиотек:

```text
R3F
Drei
Rapier
Zustand
Motion
Howler
tma.js
```

## 2. Copy primitive

Для отдельных UI/animation patterns:

```text
shadcn
Motion Primitives
Radix
```

Только если лицензия разрешает.

## 3. Asset source

Для:

```text
Kenney
Poly Haven
construction assets
```

Ассет:

```text
скачать
↓
зафиксировать source/license
↓
адаптировать
↓
оптимизировать
↓
положить локально в проект
```

## 4. Reference only

Для:

```text
Tower Builder
Stack
Cinematic examples
Racing game architecture
```

Если не требуется или нельзя напрямую переносить код.

---

# Итоговая философия

Мы не хотим писать всё с нуля.

Мы хотим использовать лучшие готовые открытые решения как строительные блоки.

Но финальный продукт должен иметь один авторский язык:

**Ида Лайт.**

GitHub является источником:

```text
механик
геометрии
компонентов
алгоритмов
примитивов
инфраструктуры
```

а не источником случайного визуального стиля.

Основная работа заключается в грамотной интеграции и унификации этих решений в один законченный продукт.