# GitHub Pages · 0.23.1

Проект подготовлен для `daniil1917/ida-light-2027`. Исходники, локальные модели, шрифты и обе открытки входят в публикацию. Нативные рабочие файлы Blender, архивы исходных паков, node_modules и локальные релизные ZIP в Git не добавляются. Готовые GLB и лицензии остаются в public/.

Workflow `.github/workflows/pages.yml` устанавливает зависимости из lockfile, запускает тесты, собирает `dist-next/` с адресом GitHub Pages из configure-pages и публикует артефакт. В настройках репозитория Pages должен использовать GitHub Actions.

В JavaScript пути к публичным файлам проходят через `publicAsset()` и `import.meta.env.BASE_URL`. Vite подставляет тот же базовый путь в HTML и CSS. Это сохраняет корневые URL при локальном запуске и пути `/ida-light-2027/…` на GitHub Pages.

Локальная проверка сборки с префиксом:

```sh
npm test
npx tsc -b
npx vite build --outDir dist-pages --base=/ida-light-2027/
npx vite preview --outDir dist-pages --host 127.0.0.1 --port 4184
```

Адрес проверки: http://127.0.0.1:4184/ida-light-2027/?quality=high.

Обычный локальный стенд 4183 продолжает использовать `dist-next/` с корневым базовым путём. Версия игры, сложность, качество моделей, оформление и выбор открыток не изменены.

Основа публикации: [официальный workflow GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) и [базовые пути Vite](https://vite.dev/guide/build#public-base-path).
