# GitHub Pages · 0.24.0

Игра опубликована: https://daniil1917.github.io/ida-light-2027/. Репозиторий `daniil1917/ida-light-2027`. Исходники, локальные модели, шрифты и обе открытки входят в публикацию. Нативные рабочие файлы Blender, архивы исходных паков, node_modules и локальные релизные ZIP в Git не добавляются. Готовые GLB и лицензии остаются в public/.

Workflow `.github/workflows/pages.yml` запускает `Check game` на pull request и push в `main`: проверку зависимостей, unit-тесты, Chromium с реальными посадками и production-сборку. Только отдельная задача публикации получает `pages:write` и `id-token:write`. Публикация выполняется после успешной проверки `main`; в настройках Pages должен использоваться GitHub Actions.

В защите `main` следует сделать `Check game` обязательной проверкой pull request. Dependabot настроен на еженедельные обновления npm и GitHub Actions. В боевой HTML добавлена CSP для локальных ресурсов и WASM; ограничения на встраивание в iframe требуют HTTP-заголовка и проверки Telegram Web.

В JavaScript пути к публичным файлам проходят через `publicAsset()` и `import.meta.env.BASE_URL`. Vite подставляет тот же базовый путь в HTML и CSS. Это сохраняет корневые URL при локальном запуске и пути `/ida-light-2027/…` на GitHub Pages.

Локальная проверка сборки с префиксом:

```sh
npm test
npm audit --audit-level=high
npx tsc -b
npx vite build --outDir dist-pages --base=/ida-light-2027/
npx vite preview --outDir dist-pages --host 127.0.0.1 --port 4184
```

Адрес проверки: http://127.0.0.1:4184/ida-light-2027/?quality=high.

Обычный локальный стенд 4183 продолжает использовать `dist-next/` с корневым базовым путём. В 0.24.0 мобильный и десктопный режимы используют полное качество по умолчанию. Отчёт: [RELEASE_024_MOBILE_REVIEW.md](RELEASE_024_MOBILE_REVIEW.md).

Основа публикации: [официальный workflow GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) и [базовые пути Vite](https://vite.dev/guide/build#public-base-path).
