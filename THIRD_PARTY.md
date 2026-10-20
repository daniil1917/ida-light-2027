# THIRD_PARTY — Ida Light Game 2027

Проверка публичных upstream выполнена 28.09.2026 до написания игрового кода. README, текст лицензии, archive status и текущая корневая структура прочитаны. Машиночитаемые доказательства, URL и SHA-256: [upstream-audit.json](docs/research/upstream-audit.json). Инструмент: [audit-upstream.py](scripts/audit-upstream.py).

Таблица различает уже используемые решения и кандидатов следующих этапов. Исследование не означает включение исходников или ассетов в приложение. Runtime dependencies поставляются через npm; upstream code не изменён. Адаптированы UI Button/Slot pattern, исходная геометрия и font subset; атрибуция ниже.

| Repository / URL | Лицензия | Статус | Режим и назначение | Изменения исходников |
| --- | --- | --- | --- | --- |
| [vitejs/vite](https://github.com/vitejs/vite) | MIT | активен | Dependency · dev/build Vite | нет |
| [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber) | MIT | активен | Dependency · Canvas, render loop | нет |
| [pmndrs/drei](https://github.com/pmndrs/drei) | MIT | активен | Dependency · OrthographicCamera, Merged/createInstances, useGLTF, Environment, Text3D | нет |
| [pmndrs/react-three-rapier](https://github.com/pmndrs/react-three-rapier) | MIT | активен | Dependency · активное dynamic тело, fixed верхняя опора | нет |
| [pmndrs/zustand](https://github.com/pmndrs/zustand) | MIT | активен | Dependency · app/game store | нет |
| [radix-ui/primitives](https://github.com/radix-ui/primitives) | MIT | активен | Dependency · Slot для IdaButton; Dialog для сохранения пожелания | нет |
| [radix-ui/colors](https://github.com/radix-ui/colors) | MIT | активен | Dependency · neutral scale и UI tokens | нет |
| [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | MIT | активен | Copy primitive · адаптирован минимальный Button/Slot pattern без cva/Tailwind; собственные стили | да: Button pattern сокращён и стилизован |
| [motiondivision/motion](https://github.com/motiondivision/motion) | MIT | активен | Dependency · DOM transitions и reduced motion | нет |
| [ibelick/motion-primitives](https://github.com/ibelick/motion-primitives) | MIT | активен | Reference сейчас; greeting использует собственный Motion hero transition. Beta, целиком не устанавливаем. | нет; кандидатам ничего не копировалось |
| [Telegram-Mini-Apps/tma.js](https://github.com/Telegram-Mini-Apps/tma.js) | MIT | активен | Dependency · @tma.js/sdk; shell, viewport, user, haptics, back | нет |
| [goldfire/howler.js](https://github.com/goldfire/howler.js) | MIT | активен | Dependency · один app-lifetime Howl: один короткий эффект успешной установки без ambient; загрузка после interaction | нет |
| [pmndrs/react-postprocessing](https://github.com/pmndrs/react-postprocessing) | MIT | активен | Dependency · lazy финальные Bloom/мягкий Vignette; ACES tone mapping сохраняет цвет сцены. | нет; кандидатам ничего не копировалось |
| [catdad/canvas-confetti](https://github.com/catdad/canvas-confetti) | ISC | активен | Dependency · один короткий worker burst при завершении, resize/reduced-motion/reset. | нет; кандидатам ничего не копировалось |
| [shorepine/kenney](https://github.com/shorepine/kenney) | CC0 выбранных City/Holiday; root license только Castle Kit | активен | Asset source · City Commercial и Holiday; конкретные pack licenses сохранены. Root Castle Kit license не использована для этих пакетов. | да: импорт geometry, исходные материалы удалены, scale/Ida palette/merge |
| [KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0](https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0) | CC0 (текст LICENSE) | активен | Asset source кандидат, CC0 подтверждена текстом LICENSE. Это KayKit автора Kay Lousberg, а не Kenney, несмотря на подпись в промте. | нет; кандидатам ничего не копировалось |
| [series-ai/jam-ready-assets](https://github.com/series-ai/jam-ready-assets) | CC0 указанного KayKit, не всего каталога | активен | License source · проверены и сохранены отдельные Kenney City Commercial/Holiday LICENSE; корневая KayKit license к ним не применяется. | скопированы pack notices; geometry из shorepine |
| [Poly-Haven/polyhaven.com](https://github.com/Poly-Haven/polyhaven.com) | AGPL-3.0 | активен | Asset source через официальный Poly Haven. Код сайта AGPL-3.0 НЕ используем. HDRI/PBR assets имеют отдельную CC0 политику: https://polyhaven.com/license; использованы kloppenheim_06_puresky и concrete_wall_006. | textures resize/desaturate/WebP; HDR 1K локальный |
| [pmndrs/assets](https://github.com/pmndrs/assets) | CC0-1.0 | активен | Asset source кандидат. Несмотря на root CC0 проверяем происхождение каждого файла; Inter остаётся OFL-1.1. В первом этапе нет внешних assets. | нет; кандидатам ничего не копировалось |
| [rsms/inter](https://github.com/rsms/inter) | OFL-1.1 | активен | Font source · Inter subset 207 для Text3D; UI пока системный. | subset/Three typeface JSON; renamed Ida Digits; OFL notice сохранён |
| [hec-ovi/glb-buildings-skill](https://github.com/hec-ovi/glb-buildings-skill) | MIT | активен | Build-time generator · Node >=24; actual ground/body/crown output адаптирован в GLB главной башни. Не runtime dependency. | generator source не изменён; output нормализован/дополнен |
| [webxdc/tower-builder](https://github.com/webxdc/tower-builder) | MIT | архивирован | Reference only · архивирован и перенесён в https://codeberg.org/r10s/tower-builder. Изучены src/block.js, utils.js, hook.js, constant.js. Ни код, ни assets не перенесены. | нет; кандидатам ничего не копировалось |
| [pmndrs/racing-game](https://github.com/pmndrs/racing-game) | MIT | активен | Reference only · component separation, R3F game structure. Никакой racing logic и assets не перенесены. | нет; кандидатам ничего не копировалось |
| [MushroomFleet/CinematicIntros-JSX](https://github.com/MushroomFleet/CinematicIntros-JSX) | Apache-2.0 | активен | Reference only · camera sequence. README badge заявляет MIT, actual LICENSE — Apache-2.0; учитываем actual LICENSE. Кода не переносим. | нет; кандидатам ничего не копировалось |
| [fczuardi/construction-game](https://github.com/fczuardi/construction-game) | не подтверждена | активен | Reference only · README заявляет MIT, отдельный LICENSE отсутствует, assets 32+ авторов. Ничего не копируем; безопасная альтернатива для окружения — проверенные CC0 KayKit/Kenney пакеты. | нет; кандидатам ничего не копировалось |
| [artginzburg/stack](https://github.com/artginzburg/stack) | не подтверждена | архивирован | Reference only · архивирован; LICENSE не найден. Ничего не копируем; используем документированные ортографические камеры Drei вместо заимствования реализации. | нет; кандидатам ничего не копировалось |
| [facebook/react](https://github.com/facebook/react) | MIT | активен | Dependency · React / React DOM | нет |
| [mrdoob/three.js](https://github.com/mrdoob/three.js) | MIT | активен | Dependency · Three.js, единственный 3D renderer через R3F | нет |
| [microsoft/TypeScript](https://github.com/microsoft/TypeScript) | Apache-2.0 | активен | Dev dependency · type checking | нет |
| [vitest-dev/vitest](https://github.com/vitest-dev/vitest) | MIT | активен | Dev dependency · границы overlap и инварианты store | нет |
| [vitejs/vite-plugin-react](https://github.com/vitejs/vite-plugin-react) | MIT | активен | Dev dependency · React/Vite integration | нет |
| [donmccurdy/glTF-Transform](https://github.com/donmccurdy/glTF-Transform) | MIT | активен | Build-time dependency · weld/dedup/prune/meshopt, bounds/UV/budget inspection. | нет |
| [DefinitelyTyped/DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) | MIT (actual LICENSE) | активен | Dev dependency · определения @types/howler; GitHub metadata NOASSERTION, текст лицензии MIT | нет |

## Источники и решения

- [R3F README](https://github.com/pmndrs/react-three-fiber) и [Rapier package README](https://github.com/pmndrs/react-three-rapier/blob/main/packages/react-three-rapier/readme.md): совместимая линия React 19 / Fiber 9 / Rapier 2. Корневой Rapier README является ссылкой на package README; прочитан именно package README.
- [Telegram platform](https://core.telegram.org/bots/webapps) и [tma SDK](https://docs.telegram-mini-apps.com/packages/tma-js-sdk): viewport и safe-area учитываются в shell. SDK не заменяет проверку на устройствах.
- [Poly Haven license](https://polyhaven.com/license): CC0 относится к media assets; AGPL относится к коду сайта. Код сайта не нужен.
- Tower Builder: концептуально изучены swing/drop/land/rotate/out и состояния попадания; алгоритм overlap написан под требования промта. webxdc, cooljs, Zepto, webpack, музыка и графика не копировались.
- Crane/Floor первого этапа заменены на оптимизированные локальные GLB. Источники, SHA-256 и budgets сохранены; генератор архитектуры работает только при сборке.

## Атрибуция скопированного UI primitive

IdaButton использует адаптированный Button/Slot pattern из [shadcn Button](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/button.tsx). Удалены Tailwind, cva, variants; использованы собственные CSS tokens. Copyright (c) 2023 shadcn. MIT notice сохранён в [licenses/shadcn-ui-MIT.txt](licenses/shadcn-ui-MIT.txt).

## Аудио второго этапа

`public/audio/impact.wav` (48 кГц, без фонового трека) — собственный детерминированный синтез из [generate-audio.py](scripts/generate-audio.py). Внешних сэмплов, записей и музыки Tower Builder нет. Звуки распространяются как CC0-1.0; [notice](public/audio/LICENSE.txt), размеры и SHA-256 в [manifest.json](public/audio/manifest.json). Других игровых сигналов нет. Внешний аудиокодек для генерации не требуется.


## Художественные ассеты третьего этапа

| Что вошло | Проверенный источник / версия | Лицензия и изменения |
| --- | --- | --- |
| Масса base/body/crown | hec-ovi/glb-buildings-skill 0.4.0, commit `6e05c323017e13c6b993cec2d6b14bd26f5b1a7c` | MIT · исходный CLI без изменений; actual output → независимые модули. [Notice](licenses/glb-buildings-MIT.txt) |
| Building a/c/f/h | shorepine/kenney commit `3694c6879e487c108f55677be7dd2ca75b07cc3b`; [официальный City Kit Commercial](https://kenney.nl/assets/city-kit-commercial) | CC0 · [pack license 2.1](licenses/Kenney-City-Commercial.txt); atlas materials удалены, scale/Ida palette/merge |
| Tree decorated snow, 2 gifts, bench | тот же Kenney commit; [официальный Holiday Kit](https://kenney.nl/assets/holiday-kit) | CC0 · [pack license 2.0](licenses/Kenney-Holiday.txt), подтверждённая отдельным файлом series-ai каталога; нормализация/общие материалы |
| HDR kloppenheim_06_puresky | [Poly Haven](https://polyhaven.com/a/kloppenheim_06_puresky) | CC0 по [asset policy](https://polyhaven.com/license); локальный 1K HDR, без website code |
| Concrete wall 006 diffuse/normal/roughness | [Poly Haven](https://polyhaven.com/a/concrete_wall_006) | CC0; resize 512px/WebP, diffuse desaturated и осветлён под Ida palette |
| 3D glyphs 2/0/7 | rsms/inter commit `353b61b9f4430d5f420d56605a6e7993e0941470` | OFL-1.1 · subset и Three typeface, переименован Ida Digits; [copyright/license](licenses/Inter-OFL.txt) |

Pack LICENSE из series-ai использованы только как лицензии двух конкретных Kenney-пакетов; содержимое других пакетов не включено. URL каждого скачанного файла, размеры и SHA-256: [provenance.json](assets/sources/provenance.json), [font provenance](assets/sources/fonts/provenance.json). Оптимизированные GLB и проверки: [assets-report.json](docs/research/assets-report.json). Distribution содержит public/ASSET_NOTICES.md, pack notices и fonts/OFL.txt.

Дополнительные build dependencies: [meshoptimizer](https://github.com/zeux/meshoptimizer) MIT ([notice](licenses/meshoptimizer-MIT.txt)); [Khronos glTF Validator](https://github.com/KhronosGroup/glTF-Validator) Apache-2.0 ([license](licenses/glTF-Validator-Apache-2.0.txt), [notices](licenses/glTF-Validator-NOTICES.txt)); [opentype.js](https://github.com/opentypejs/opentype.js) MIT ([notice](licenses/opentype-MIT.txt)); glTF Transform MIT ([notice](licenses/glTF-Transform-MIT.txt)). Код этих tools не изменён и не входит в игровой runtime. Browser decoder Meshopt поставляется через Three/Drei.

Кран, дополнительные рамы/площадка, маска света окон и снег shader — собственные элементы проекта. Визуальные элементы чужой архитектуры приведены к общим материалам. Генератор не требует Blender; использование Blender позже возможно для художественной правки.

## Перед выпуском

Каждый включённый GLB/HDRI/audio/font получает отдельную запись с URL, лицензией и изменениями. Root license смешанного каталога не доказывает лицензию конкретного ассета. Зависимости зафиксированы package-lock.json; их license notices следует включать в production distribution.

## Финальные эффекты четвёртого этапа

@react-three/postprocessing 3.1.3 — MIT ([notice](licenses/react-postprocessing-MIT.txt)); core postprocessing 6.39.5 — **Zlib**, Copyright © 2015 Raoul van Rüschen ([notice](licenses/postprocessing-Zlib.txt)), а не MIT wrapper. canvas-confetti 1.9.4 — ISC ([notice](licenses/canvas-confetti-ISC.txt)); @types/canvas-confetti — DefinitelyTyped MIT. Все npm зависимости не изменены, notices сохранены в public/licenses. CinematicIntros-JSX остаётся reference: код не копировался.

Confetti и карточка пожелания подготавливаются при загрузке сцены. Тяжёлые DOF/SSAO/glitch/distortion отсутствуют. Единственный звук установки — собственный синтез CC0, внешних записей нет.

## Итоговая distribution

`@radix-ui/react-dialog` добавлен как неизменённая MIT dependency из ранее проверенного radix-ui/primitives; точный notice сохранён в licenses/radix-primitives-MIT.txt и public/licenses. Motion Primitives остался reference; код не копировался. Runtime license plugin перечисляет только пакеты, включённые после tree shaking: docs/research/runtime-notices.json → dist/RUNTIME_NOTICES.txt. Для Fiber, React Three Rapier, Rapier WASM, maath и react-remove-scroll-bar npm archives не содержат LICENSE: оригинальные upstream notices сохранены в licenses/runtime-*.txt; README/license/archive audit и blob hashes — docs/research/runtime-upstream-notices.json. Открытка PNG — оригинальный Canvas2D artwork проекта, без внешних изображений/шрифтов.

## Пересборка 0.7.0 из архивов пользователя

City Kit Commercial 2.1 / Holiday Kit 2.0: дополнительные исходники взяты из приложенных ZIP, с сохранением CC0 notices и SHA-256 в `assets/sources/provenance.json`. Фасад — клипированный сегмент building-skyscraper-a с UV/нормалями; площадь — low-detail-building-a/h, tree-snow-a, lantern, snow-flat-large, snow-pile и прежние tree/gifts/bench. Исходные atlas-цвета отсутствуют в runtime.

Euclid Circular A, Copyright (c) 2018 by Swiss Typefaces. All rights reserved.: пользовательский архив «Шрифт — копия.zip», разрешение использовать дано в чате. Семейство коммерческое; открытая лицензия не заявляется. Исходные OTF и хэши: `assets/sources/fonts/euclid/provenance.json`. Локальные WOFF2 300/400/500/600 содержат кириллицу, латиницу и UI-символы; 3D JSON содержит только 2/0/7. Copyright сохранён в `public/fonts/Euclid-NOTICE.txt`. FontTools/Brotli используются только при подготовке шрифта, их код не входит в runtime.

Inter и HDR больше не включены в distribution 0.7.0; исходники и прежние записи сохранены для истории. Открытка PNG теперь использует Euclid. Базовая масса генератора сохранена только для основания/крыши. Актуальные notices — `public/ASSET_NOTICES.md`.

## Рождественские правки 0.7.1

По новой инструкции пользователя оригинальные красные/зелёные/древесные цвета Holiday восстановлены: atlas samples → линейные vertex colors, сохраняются после Meshopt. glTF UV начинаются от верхней стороны текстуры; семплирование использует v без инверсии. Добавленные файлы из того же CC0 ZIP внесены в provenance. Официальный wordmark извлечён из header `.TheLogo` https://idalite.ru/, геометрия путей сохранена, белая заливка для тёмного фона; provenance в public/branding/. Favicon — первая буква wordmark. Kenney CC0 notice и пользовательский Euclid copyright сохраняются.

## UI 0.9.0 · Fluid Functionalism

Actual registry source vendored in `src/ui/fluid/` with original JSON snapshots and SHA-256 in `assets/sources/fluid-functionalism/`. MIT Copyright (c) 2026 Micka Touillaud; full license in `licenses/fluid-functionalism-MIT.txt` and runtime distribution. Components replace previous shadcn/Ida controls. Tailwind v4 generates the upstream utility styles. Motion is reused instead of adding framer-motion again. Inter is not bundled; static Euclid weights are used.

## Открытка 0.21.0

HTML, рисунок и шейдеры фольги предоставлены пользователем в holographic-card.html. Архив источника и SHA-256: assets/sources/holographic-card/. Это материалы проекта, не внешняя библиотека. Чёрный фон страницы не перенесён. Изображение 1052×1494 и исходный HTML сохранены без изменений. В 0.22.0 исправлена траектория полосы блика в fragment shader; vertex shader и фактура фольги сохранены. Графические библиотеки и сетевые сервисы не добавлялись.
