# Technical overview

## Stack and tooling

- **Runtime:** React 19.2.4 (`react`, `react-dom`), built with Vite 8.1.5 and `@vitejs/plugin-react` 6.0.3 (both pinned).
- **Base path:** `vite.config.js` sets `base: "/wwe-universe/"` for GitHub Pages. Do not change it.
- **Tests:** Vitest (^4.1.0) with jsdom (^27.0.0) and React Testing Library. Setup in `vitest.setup.js`. Tests are co-located `*.test.js(x)` files; `src/**` and `test/**/*.ts` stubs are excluded.
- **Lint:** flat config in `eslint.config.mjs` (ESLint with `@eslint/js`, `react-hooks`, `react-refresh`, `globals`). Ignores `dist/**`, `node_modules/**`, `src/**`, `test/**/*.ts`.
- **Scripts:** `dev`, `build`, `lint`, `test` (watch), `test:run` (once), `check` (lint + test:run + build).
- **Dependencies:** exact versions in `package-lock.json`. Use `npm ci` in CI.
- **Node:** version from `.github/workflows/deploy.yml`; no change needed for the pinned engines.

## Universe data schema (v2)

- **Location:** `universe/` (leaf module `constants.js`; `schema.js` imports only from `constants.js`).
- **Storage key:** `wwe-universe-v2` (`V2_KEY`). Document has `schemaVersion: 2`; legacy data is `schemaVersion` 1 (keys `wrestlers`, `currentWeek`), migrated by a separate story.
- **Wrestler IDs:** `w_` + UUID from `newId('w')`, generated once and never derived from the name. Renaming changes `name` only.
- **Entities:** Universe, Wrestler (`notes` string, `legacy?`), MatchResult, Event (`state` proposed/accepted/rejected, `suggestions?`, `matchId?`, `rerollCount?`), Relationship, Faction, Storyline, Settings.
- **Validation:** `validateUniverse(obj)` returns string errors, never throws. Checks schema version, required arrays, referential integrity (IDs resolve to a wrestler or `formerWrestlers` key), duplicate wrestler IDs, and at most one `proposed` event.
- **Settings:** `DEFAULT_SETTINGS` = eventFrequency 25, chaos 50, historySensitivity 50, autoPropose true, seed null (set integer on create), aiEnabled false, aiEndpoint "". `validateSettings` requires three integer sliders 0–100, boolean flags, and an `aiEndpoint` that is empty or an `https:` URL.
- **Tests:** `npx vitest run universe`.

## Simulation engine: seeded randomness

Module: `universe/sim/rng.js` (pure, no I/O, no imports).

| Function | Purpose |
|---|---|
| `createRng(seed?)` | Independent RNG closure. Returns `{seed, next, int, pick, weightedPick}`. Seed normalised to uint32; no seed uses `defaultSeed()`. |
| `deriveSeed(seed, n)` | Deterministic uint32 sub-seed. Reroll uses `deriveSeed(prevSeed, attempt)` with attempt starting at 1. `n=0` is reserved for the description stream (US-127). |
| `defaultSeed()` | Time-based seed with a module-level counter. Does not use `Math.random`. |

Rules:
- Code in `universe/sim/` must never call `Math.random`. Enforced by a test in `rng.test.js`.
- Each event proposal stores its seed so it can be replayed.

Tooling: Vitest is the test runner (`npm run test`). Lint config is `eslint.config.mjs` (flat config, `@eslint/js`, `react-hooks`, `react-refresh`).

## Simulation engine: event type catalogue

Module: `universe/sim/config.js` (US-123). Tests: `universe/sim/config.test.js`.

| Export | Value / purpose |
|---|---|
| `TIERS` | `common` weight 70, `uncommon` 25, `rare` 5 |
| `EVENT_TYPES` | 8 types keyed by id: `confrontation`, `respect`, `interference`, `save`, `ambush`, `betrayal`, `faction`, `return` |
| `HISTORY_WINDOW_WEEKS` | 4 (US-125) |
| `SUGGESTION_MIN_STORYLINE_EVENTS` | 2 (US-126) |
| `CHAOS_DELTA_JITTER` | used by relationship deltas (US-126) |
| `validateConfig(types, tiers)` | returns error strings; empty array = valid |

Fields per event type: `id, label, tier, minParticipants, maxParticipants, cooldownWeeks, pairCooldownWeeks, roles, relationRule, deltas, requiresInactiveWrestler?`.

- `roles` maps to `participantIds` positions (`a` = index 0).
- `relationRule` is a string id. Rule logic is implemented in US-124. Values: `none`, `notEnemies`, `helperNotHostile`, `saviourAlly`, `hostileOrChaos`, `priorAlly`, `factionFormable`.
- `deltas` are added in US-126.
- Cooldowns: common 2 weeks, uncommon 4, rare 8; pair cooldown is twice the type cooldown (tunable).
- `return` sets `requiresInactiveWrestler: true` and is skipped unless a wrestler has `status === 'inactive'`.

Defaults and constants: `DEFAULT_SETTINGS` is owned only by `universe/constants.js` (US-113). `sim/config.js` imports from it and does not re-export it. Import direction: `constants.js` ← `sim/config.js`; `schema.js` never imports `sim/*`.
