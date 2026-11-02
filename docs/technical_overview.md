# Technical overview

## Stack and tooling

- **Runtime:** React 19.2.4 (`react`, `react-dom`), built with Vite 8.1.5 and `@vitejs/plugin-react` 6.0.3 (both pinned).
- **Base path:** `vite.config.js` sets `base: "/wwe-universe/"` for GitHub Pages. Do not change it.
- **Tests:** Vitest (^4.1.0) with jsdom (^27.0.0) and React Testing Library. Setup in `vitest.setup.js`. Tests are co-located `*.test.js(x)` files; `src/**` and `test/**/*.ts` stubs are excluded.
- **Lint:** flat config in `eslint.config.mjs` (ESLint with `@eslint/js`, `react-hooks`, `react-refresh`, `globals`). Ignores `dist/**`, `node_modules/**`, `src/**`, `test/**/*.ts`.
- **Scripts:** `dev`, `build`, `lint`, `test` (watch), `test:run` (once), `check` (lint + test:run + build).
- **Dependencies:** exact versions in `package-lock.json`. Use `npm ci` in CI.
- **Node:** version from `.github/workflows/deploy.yml`; no change needed for the pinned engines.
