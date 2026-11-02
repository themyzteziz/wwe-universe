# US-116: Upgrade to React 19 and set up Vitest + React Testing Library
**Status:** Ready for UAT · **Category:** devops · **Points:** 3 · **Sprint:** —

## Summary
The project now runs on React 19 with Vite, and has a working test runner (Vitest with jsdom and React Testing Library). Lint is fixed with a Vite/React flat ESLint config, and the team checks command (`npm run check`) now includes the test run. The app itself behaves as before for users.

## What was built
- `package.json`: pinned `vite` and `@vitejs/plugin-react` to the resolved versions; added test and lint devDependencies; scripts `test` (watch), `test:run` (once), `check` (lint + test:run + build).
- `vite.config.js`: `defineConfig` from `vitest/config`; jsdom test environment, `vitest.setup.js` as setup file, test include/exclude rules. `base: "/wwe-universe/"` unchanged.
- `vitest.setup.js`: loads `@testing-library/jest-dom/vitest`; after each test runs `cleanup()` and clears `localStorage`.
- `App.test.jsx`: smoke test for `<App />`.
- `eslint.config.mjs`: replaces the Next.js config with a Vite/React flat config.
- `package-lock.json`: regenerated.

## Compatibility
Exact versions are recorded in `package-lock.json`, which is authoritative (accepted by the product owner). Semver ranges are listed for the packages that are not pinned.

| Dependency | Resolved version | Result |
|---|---|---|
| react | 19.2.4 | OK (already on 19) |
| react-dom | 19.2.4 | OK (already on 19) |
| vite | 8.1.5 (pinned) | OK |
| @vitejs/plugin-react | 6.0.3 (pinned) | OK |
| vitest | ^4.1.0 | OK, major matches the pinned Vite peer range |
| jsdom | ^27.0.0 | OK |
| @testing-library/react | per lockfile | OK |
| @testing-library/dom | per lockfile | OK |
| @testing-library/jest-dom | per lockfile | OK |
| @testing-library/user-event | per lockfile | OK |
| eslint | per lockfile | OK |
| @eslint/js | per lockfile | OK |
| eslint-plugin-react-hooks | per lockfile | OK |
| eslint-plugin-react-refresh | per lockfile | OK |
| globals | per lockfile | OK |
| eslint-config-next | not installed | Replaced: the old config could not load and was removed |

## How it works
- **AC 1, compatibility:** this table documents each dependency. Exact versions are in the lockfile.
- **AC 2, React 19:** `react` and `react-dom` resolve to one version each (19.2.4). BOOKING and WRESTLERS behave as before.
- **AC 3, test runner:** `npm test` starts Vitest in watch mode; `npm run test:run` runs once. The smoke test renders `<App />`, checks the BOOKING and WRESTLERS nav buttons and the "Match Generator" heading, and checks that clicking WRESTLERS replaces the BOOKING content. Legacy `.ts` stubs under `src/` and `test/` are not collected.
- **AC 4, lint:** `npm run lint --silent` runs the flat config. Only generated and legacy-stub paths are ignored.
- **AC 5, build:** `npm run build --silent` succeeds. `dist/index.html` still references `/wwe-universe/assets/`.
- **AC 6, checks:** `npm run check` runs lint, tests and build. From this story on, the project checks include the test run.

## How to test
**Unit tests:** `npm run test:run` (once) or `npm test` (watch). Full gate: `npm run check`.

- **AC 1 Verify:** this document has the Compatibility table with a result for each dependency.
- **AC 2 Verify:** `npm ls react react-dom` shows 19.2.4 once each. `npm run dev` renders the app. Generate and reroll a match, change wins, status and champion, and add and edit a wrestler as before.
- **AC 3 Verify:** `npm run test:run` collects `App.test.jsx` and passes. No `src/**` or `test/**/*.ts` stub is collected.
- **AC 4 Verify:** `npm run lint --silent` exits 0.
- **AC 5 Verify:** `npm run build --silent` exits 0. `vite.config.js` has `base: "/wwe-universe/"`. `dist/index.html` references `/wwe-universe/assets/`.
- **AC 6 Verify:** `npm run check` exits 0.

## Deployment notes
- **Pre-deploy:** run `npm install` and commit the regenerated `package-lock.json`. Use `npm ci` in CI so the lockfile versions are used.
- **Node version:** the version in `.github/workflows/deploy.yml` was checked against the pinned Vite and Vitest engines. No bump was required.
- **Configuration:** none. No secrets are used. Test setup clears `localStorage` only inside jsdom.

## Known limitations
- Migration to TypeScript is out of scope.
- The manual dev-server check (AC 2) and `npm ls` were verified statically in QA. A manual run of `npm run dev` is still recommended before release.
- Removing the generated `src/**/*.ts` and `test/**/*.ts` stubs is a separate cleanup.
