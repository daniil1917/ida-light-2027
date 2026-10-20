# Pipeline архитектурных ассетов · 0.13.0

Готовые GLB, карты и шрифты находятся в public/. Исходники, лицензии и provenance — в assets/ и licenses/. Обычный Vite-запуск не требует Blender, сети или генерации.

## Пересборка

```bash
# Python 3: Pillow для карт, fonttools + brotli для WOFF2.
python3 scripts/prepare-textures.py
python3 scripts/prepare-brand-fonts.py
npm run assets:font
npm run assets:build
npm run assets:optimize
# Blender 5.2; Python с Pillow и NumPy. Офлайн, несколько минут.
blender --background --python scripts/bake-quarter.py
python3 scripts/pack-lightmap.py
npm run assets:pack-quarter
npm run assets:inspect
```

1. Палитра UI: src/app/brand.json; природные материалы здания: src/scene/scenePalette.json. Синий #245BF3, чёрный #1A1B1D, белый #FFFFFF, серые #656D80/#EFEFEF. WOFF2 и CSS генерируются из пользовательских Euclid Circular A OTF: 300/400/500/600, кириллица/латиница/символы. Copyright сохранён в fonts/Euclid-NOTICE.txt. assets:font создаёт Three.js subset 2/0/7 из Medium.
2. Concrete CC0 → нейтральные WebP 512px; window mask 64px белая. HDR исключён из runtime и distribution.
3. Фасад из building-skyscraper-a.glb: клипирование треугольников по Y 1.146–1.493 с интерполяцией UV/нормалей; нормализация до 2.88 × 0.62 × 2.53 и дополнительные плиты/рамы. A/B/C/special совместимы с collider 3 × 0.82 × 2.65. Каждый модуль содержит Structure/Glass/WindowLights, световые панели находятся перед стеклом. Special на 7/14/20; JSON расположения окон генерируется тем же скриптом.
4. Площадь: Kenney low-detail-building-a/h, decorated snow tree, tree-snow-a, gifts, bench, lantern, snow-flat-large/snow-pile. Node transforms запекаются. Atlas применяется только для классификации поверхности; City использует нейтральные роли; Holiday сохраняет оригинальные atlas samples через линейные vertex colors. UV glTF используют v без инверсии; атлас в runtime не нужен. Роли переопределяются общими материалами Ida.
5. Основание/крыша используют сохранённый результат glb-buildings-skill 0.4.0 (MIT), commit 6e05c323017e13c6b993cec2d6b14bd26f5b1a7c: assets/buildings/projects/ida/build/model.glb. CLI требуется только для повторной генерации этой массы через assets:massing; другие шаги работают с локальным результатом. Кран/детали — работа проекта.
6. glTF Transform weld → dedup → prune с сохранением UV/nodes → Meshopt. Runtime decoder из Three/Drei, Draco выключен. Quantized transforms перед instancing запекаются в Float32 (покрыто тестом).
7. Inspection декодирует Meshopt и проверяет Khronos validator, UV/nodes, bounds 3 × 0.82 × 2.65, budget <250 KB/floor. Ошибка останавливает сборку. Девять моделей: 0 ошибок, 0 предупреждений. SHA-256 — models/manifest.json; полный inventory — asset-manifest.json.

| Модель | Оптимизированный размер | Треугольники |
| --- | ---: | ---: |
| ida-base.glb | 16,116 B | 540 |
| ida-city.glb | 139,352 B | 5603 |
| ida-crane.glb | 29,432 B | 1224 |
| ida-holiday-trim.glb | 40,112 B | 1808 |
| ida-floor-a.glb | 14,808 B | 618 |
| ida-floor-b.glb | 17,156 B | 666 |
| ida-floor-c.glb | 16,632 B | 630 |
| ida-floor-special.glb | 17,112 B | 666 |
| ida-roof.glb | 13,796 B | 456 |

0.8.0: все GLB 304 516 B (~297 KiB); рождественский декор увеличивает сцену относительно 0.7.0, но остаётся меньше первоначальных 328 732 B. Четыре WOFF2: 129 652 B (~127 KiB). База/A/B/C/кран/материалы загружаются сначала; город — после первого кадра, special — с 6-го, roof/font/final chunks — с 17-го этажа.

## Источники

Kenney City Kit Commercial 2.1 и Holiday Kit 2.0 — пользовательские ZIP, CC0. Архивы/файлы с SHA-256: assets/sources/provenance.json. Euclid: assets/sources/fonts/euclid/provenance.json, разрешение пользователя в чате; открытая лицензия не заявляется. Poly Haven concrete — CC0 media, без кода сайта.

Distribution сохраняет ASSET_NOTICES.md, fonts/Euclid-NOTICE.txt, licenses/ и RUNTIME_NOTICES.txt. Исторические Inter/HDR источники остаются в assets/, но не включаются в новую сборку. Прежние fetch-скрипты — история получения исходников, не шаг актуального pipeline.

Кран экспортирует Boom, Trolley, Foot и Mast (секция y=0..1). Runtime собирает мачту instancing и поднимает только Boom с ростом дома. Inspector проверяет grounded bounds мачты/основания и сохранение красных/зелёных vertex colors в городе. Logo в branding/ включён в asset-manifest.

0.7.2: src/game/constructionConfig.json используется генератором крана, балансом игры и inspector. Мачта/основание вынесены за полосу движения этажей; длина стрелы включает весь коридор башни ±1.5, амплитуду 2.8, половину ширины тележки и запас 0.2 с каждой стороны. Inspector проверяет зазор по Z и покрытие всего диапазона тележки.

0.8.0: Boom содержит неподвижную поперечную ферму, Rail_0/1/2 — единичные профили телескопа. Runtime изменяет только X-длину профилей; мачта/кабина/подвес не деформируются. Inspector проверяет единичные bounds профилей. Trim/Wreath используют исходные vertex colors Holiday и общие инстансы всех этажей. Зимний фон — собственный SVG проекта в branding/winter-sky.svg. Исторические записи 0.7.x выше фиксируют предыдущую реализацию.

## Материалы 0.9.0

GLB `building-skyscraper-a` повторно сверен с новым пользовательским ZIP по SHA-256 — идентичен. Исходное превью: `design/rebuild/building-skyscraper-a.png`. Тёмная версия была следствием рематериализации, а не другого исходника. Фасад `#d4d0c8` использует бетонные normal/roughness без умножения на тёмную diffuse; стекло `#829cac` с metalness 0.05, металл `#68737c`; fill постоянный 1.25, ground hemisphere светло-серый. Форма этажей сохранена. Полный инспектор повторно проверил 9 GLB, без ошибок/предупреждений; суммарный размер 304484 B.

- ida-base.glb: 16112 B
- ida-city.glb: 139348 B
- ida-crane.glb: 29428 B
- ida-floor-a.glb: 14808 B
- ida-floor-b.glb: 17148 B
- ida-floor-c.glb: 16628 B
- ida-floor-special.glb: 17108 B
- ida-holiday-trim.glb: 40112 B
- ida-roof.glb: 13792 B

## Праздничная площадь · 0.9.1

Две задние декоративные постройки удалены из runtime City. Их заменяют три заснеженные ёлки; санки, круглый подарок и зелёный леденец добавлены из пользовательского Holiday ZIP. Точные архивные пути и SHA-256 записаны в source provenance. 9 GLB суммарно 311604 B; ida-city — 146468 B / 6761 triangles. Все 9 моделей: 0 ошибок / 0 предупреждений.

## Квартал и свет · 0.10.0

Генератор использует уже сохранённые building-a/c/f/h из City Kit: 16 зданий вокруг площадки. Фасады и горизонтальные поверхности получают нейтральные материалы, оконные поверхности — WindowWarm. Holiday сохраняет исходные цвета. Дороги, переходы, низкое ограждение, 14 фонарей, контейнер, ящики, трубы и 18 округлых деревьев генерируются из примитивов. Статический foreground и neighborhood объединены по ролям материалов. GarlandBulbs — отдельный общий инстансный слой на этажах; Trim/Wreath читаются по именам материалов, поскольку glTF loader делает имена одноимённых узлов уникальными.

10 GLB: 1581260 B, 0 ошибок / 0 предупреждений. Новый ida-neighborhood: 1241280 B / 78504 треугольника. Inspector проверяет роли квартала, высоту и бюджет 1.5 MB / 90k triangles, материалы гирлянды и прежнюю совместимость коллайдеров. Размер квартала заметно больше старого декора; low пока использует ту же геометрию, но отключает дорогие эффекты. Реальные телефоны и FPS требуют отдельного замера.

Свет: локально генерируемый Drei Environment с двумя Lightformer, hemisphere + key/fill; SoftShadows только на high. HDR/CDN и новые библиотеки не нужны. Материалы окон и лампочек светятся, Bloom работает на high/medium. Фонари используют общий lamplight.svg и один InstancedMesh для имитации световых пятен; эти пятна не являются физически рассчитанным непрямым светом. Никакое запекание Blender на этом этапе не выполнялось. Старое winter-sky.svg сохранено как исторический ассет, но текущая сцена использует светлый фон/туман.

## Разметка и AO · 0.11.0

Стекло Kenney определяется по насыщенному синему swatch (b>170 и b>1.3r), а не по любой синеве кладки. save() строит BVH по геометрии модели, трассирует 12 детерминированных полусферических лучей с radius .6 и пишет локальное затенение в COLOR_0. Holiday RGB умножается на это затенение; исходные красные/зелёные цвета сохранены. Runtime использует vertexColors на соответствующих shared PBR material roles. Дополнительные снежные кромки этажей находятся внутри bounds 3×.82×2.65.

Квартал: 1,859,028 B / 109,092 triangles после Meshopt, один mesh на роль. Бюджет инспектора пересмотрен до 1.9 MB / 110,000 triangles для AO, крыш, трёх машин и 16 облегчённых дальних домов. Ни одно дополнение не добавляет физические тела. N8AO и локальные источники света отключены в low; запечённые цвета/контактные пятна остаются.

## Одинаковая архитектура и лёгкие тени · 0.12.0

Оба кольца квартала используют один neighborhoodHouse() с четырьмя исходными Kenney building-a/c/h/f: оконные проёмы, этажные карнизы, снег, бортики, надстройки, венки и ёлки. Import cache ускоряет генерацию; geometry clones остаются независимыми. После Meshopt квартал 2,796,848 B / 160,008 triangles; один mesh на роль, без физических тел. Локальное vertex AO сохранено. Статический квартал исключён из динамического shadow depth pass: 32 приблизительные проекции домов собраны в одну 1024×1024 SVG-текстуру, выводимую одним прозрачным mesh. Это имитация статических теней, а не физически рассчитанный lightmap. Динамическая башня и передние объекты получают обычную 1024 shadow map. Runtime N8AO/PCSS/SMAA/TiltShift, Environment и point lights удалены; остались Bloom .25 resolution, ACES, Vignette и FXAA.


## Запечённый квартал и стабильная крыша · 0.13.0

Статический квартал импортируется из локального ida-neighborhood.glb в Blender 5.2.2. Weld удаляет дубли вершин и вырожденные треугольники без изменения силуэтов домов. UV BakedLight создаются через Smart Project и pack islands; крупная земля получает ограниченную плотность UV, чтобы крыши и фасады оставались читаемыми. Cycles: 4096px, 16 samples, 3 bounces, sun 1.45 / 5°, world .65, COMBINED DIRECT/INDIRECT/DIFFUSE/EMIT/COLOR, EXTEND margin 32px. Второй albedo bake используется для художественного заполняющего света: нижняя граница 45% albedo и нейтральный минимум .07 в линейном пространстве. Это сохраняет нейтральные оттенки и смягчает чёрные контактные тени.

pack-lightmap.py расширяет пустые пиксели вокруг островов на 24px перед LANCZOS downsample. Runtime lightmap: RGB WebP 2048×2048, 534098 B; около 21.3 MiB GPU с mipmaps. pack-quarter.mjs экспортирует Meshopt с 16-bit position/UV, без неиспользуемых нормалей: ida-quarter-baked.glb 1211580 B / 157808 triangles / один primitive. Runtime использует MeshBasicMaterial, SRGBColorSpace, flipY=false. Квартал не участвует в динамическом shadow pass. Старые runtime ida-neighborhood.glb и quarter-shadows.svg копируются в .cache/legacy-quarter и исключаются из distribution; сырой исходник и старые releases сохранены.

Редактируемая сцена света: assets/baked/quarter-lighting.blend. Исходные карты: quarter-light.png и quarter-albedo.png. Для запуска игры Blender/Python не нужны. Материалы башни и крана остаются динамическими. Тени high/medium/low: 2048/1024/512; composer только high. Первый шаг снижения качества сохраняет DPR, а устойчивые 58 fps позволяют вернуться на один уровень выше. После неудачного повышения действует 120-секундная пауза перед следующей пробой.

В четырёх этажах верх бетона отделён от снежной поверхности приблизительно на 18mm: раньше оба слоя достигали Y=.410 и вызывали z-fighting. Габариты 3×.82×2.65 и коллайдеры сохранены. Inspector требует минимум .014 между верхом Structure и Snow и проверяет квартал до 1.6MB / 170000 triangles, UV и один primitive. Актуальные SHA-256/размеры: public/models/manifest.json; проверки — design/revision-0.13.0/VERIFICATION.md.
