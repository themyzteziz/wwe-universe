# US-116: Upgrade to React 19 and set up Vitest + React Testing Library
**Type:** story · **Category:** devops · **Points:** 3

## Summary
React 19 was already pinned. This story pins Vite and the React plugin, adds Vitest + jsdom + React Testing Library, replaces the broken Next.js ESLint config with a Vite/React flat config, and adds a `check` script (lint + tests + build).

## Compatibility
Versions for react, react-dom, vite and @vitejs/plugin-react are the ones resolved in `package-lock.json` before this story. The others are ranges installed by `npm install`; the exact resolved versions are in the regenerated `package-lock.json`.

| Dependency | Version | Result |
|---|---|---|
| react | 19.2.4 | OK (already pinned) |
| react-dom | 19.2.4 | OK (peer `react ^19.2.4`) |
| vite | 8.1.5 (pinned, was `latest`) | OK. Needs Node `^20.19.0 \|\| >=22.12.0`; CI uses Node 22 |
| @vitejs/plugin-react | 6.0.3 (pinned, was `latest`) | OK (peer `vite ^8.0.0`) |
| eslint | ^9 (lock: 9.x) | OK |
| @eslint/js | ^9.39.5 | OK (already in the lock as an eslint dependency, now explicit) |
| eslint-plugin-react-hooks | ^7.0.1 | OK, only `rules-of-hooks` and `exhaustive-deps` enabled |
| eslint-plugin-react-refresh | ^0.4.24 | OK, `only-export-components` as warning |
| globals | ^16.0.0 | OK |
| eslint-config-next | not installed | Replaced by the Vite/React flat config (`eslint.config.mjs`) |
| vitest | ^4.1.0 | OK, major whose peer range includes Vite 8 |
| jsdom | ^27.0.0 | OK |
| @testing-library/react | ^16.3.0 | OK with React 19 |
| @testing-library/dom | ^10.4.1 | OK (peer of RTL 16) |
| @testing-library/jest-dom | ^6.9.1 | OK, via `@testing-library/jest-dom/vitest` |
| @testing-library/user-event | ^14.6.1 | OK |

Node in `.github/workflows/deploy.yml` stays at 22, which satisfies Vite 8 and Vitest.

## What was built
- `package.json`: pinned `vite` and `@vitejs/plugin-react`, new devDependencies, scripts `test`, `test:run`, `check`.
- `vite.config.js`: `vitest/config`, `base: "/wwe-universe/"` unchanged, jsdom test block. Legacy stubs (`src/**`, `test/**/*.ts`) are excluded, so later `test/*.test.jsx` files are collected.
- `vitest.setup.js`: jest-dom matchers; after each test, RTL cleanup and `localStorage.clear()`.
- `App.test.jsx`: smoke tests for the BOOKING and WRESTLERS buttons and the "Match Generator" heading.
- `eslint.config.mjs`: Vite/React flat config. It ignores `dist`, `node_modules`, `src` and `test/**/*.ts` only.

## How to test
- `npm install`, then `npm run check`.
- `npm ls react react-dom` shows 19.2.4 for each.
- `npm run test:run` runs the smoke tests once. `npm test` runs Vitest in watch mode.
- Manual: `npm run dev`, generate and reroll a match, change wins, status and champion, and add and edit a wrestler.

## Deployment notes
`package-lock.json` must be regenerated with `npm install` and committed.

## Known limitations
- Legacy stub files under `src/` and `test/` are only excluded, not removed (separate cleanup).
