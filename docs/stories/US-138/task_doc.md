# US-138: CI: run tests and verify GitHub Pages deployment compatibility
**Status:** Ready for UAT · **Category:** devops · **Points:** 3 · **Sprint:** —

## Summary
The GitHub Pages deploy workflow now runs lint and the test suite before it builds the app, so a failing check stops the deployment. The deploy job, triggers, permissions and artifact upload are unchanged.

## What was built
- `.github/workflows/deploy.yml` — added "Lint" (`npm run lint`) and "Run tests" (`npm run test:run`) steps between `npm ci` and `npm run build` in the build job.
- `vite.config.test.js` — automated test covering AC 1–3 (step order, base path, unchanged deploy parts).
- `package.json` / `vite.config.js` — verified only (`test:run` = `vitest run`, `base` = `/wwe-universe/`); no change.

## How it works
- **AC 1 (Workflow):** the build job runs `npm ci` → `npm run lint` → `npm run test:run` → `npm run build`. A failing step fails the job; no `continue-on-error` is set.
- **AC 2 (Base path):** `vite.config.js` sets `base` to `/wwe-universe/`, so built asset URLs in `dist/index.html` start with `/wwe-universe/`.
- **AC 3 (No regressions):** only the two steps were added. Triggers, permissions, `actions/setup-node` cache, `upload-pages-artifact` and the deploy job are untouched.

## How to test
**Unit/checks:** `npm run check` (lint + test:run + build); `npx vitest run vite.config.test.js`.

- AC 1 — **Verify:** open `.github/workflows/deploy.yml`; build job order is `npm ci` → `npm run lint` → `npm run test:run` → `npm run build`, with no `continue-on-error`. Make a test fail locally and confirm `npm run test:run` exits non-zero.
- AC 2 — **Verify:** `npm run build`, then open `dist/index.html`: every `src`/`href` starts with `/wwe-universe/` (e.g. `/wwe-universe/assets/index-*.js`), none with bare `/assets`.
- AC 3 — **Verify:** `git diff` of the workflow shows only the two added steps; branch list, `workflow_dispatch`, `configure-pages`, `upload-pages-artifact` and the deploy job are unchanged.

## Deployment notes
- No manual steps. GitHub Pages is already configured.
- Pre-deploy: none. Post-deploy: none.
- Configuration: none new.

## Known limitations
- The AC 2 automated test checks the base configuration and root-absolute URLs in `index.html` source rather than inspecting the built `dist/index.html`. Inspecting the build output is a manual check (see How to test).
- Workflow content was verified by diff only; the workflow has not been run on GitHub from this branch.
- No new hosting targets (out of scope).
