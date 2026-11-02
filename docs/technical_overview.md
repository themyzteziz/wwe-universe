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

## Legacy migration (v1 to v2)

Module: `universe/migrate.js` (US-114). Tests: `universe/migrate.test.js`.

| Export | Purpose |
|---|---|
| `migrateLegacy(rawRoster, rawWeek)` | Pure conversion of legacy `wrestlers` JSON text and `currentWeek` into `{universe, notice?}`. |
| `ensureCurrent(storage)` | Startup entry point. Takes an object with `getItem`/`setItem`. Returns `{universe, notice?, readOnly?}`. Never throws. |
| `LEGACY_ROSTER_KEY` | `wrestlers` |
| `LEGACY_WEEK_KEY` | `currentWeek` |
| Backup suffix | `.backup-v1` |
| `V2_KEY` | `wwe-universe-v2` (defined in `universe/schema.js`) |

Algorithm of `ensureCurrent`:
1. If `wwe-universe-v2` exists, parse it and validate it with `validateUniverse`. A valid document is returned as is. An invalid document or one with `schemaVersion > 2` is saved to `wwe-universe-v2.invalid-backup` (only if not already present), and an empty Universe is returned with `readOnly: true` and a `notice`. The v2 key is not written.
2. If there is no v2 document but `wrestlers` exists, write `wrestlers.backup-v1` and `currentWeek.backup-v1` (only if absent and only if the source key exists), run `migrateLegacy`, and write `wwe-universe-v2`.
3. Otherwise, seed the roster from `data/wrestlers.json` and write `wwe-universe-v2`. No backup.
4. Any `getItem`/`setItem` exception is caught. The computed Universe is returned with the notice "Storage unavailable — changes won't be saved".

Field mapping (legacy → Wrestler):

| Target | Source |
|---|---|
| `id` | `newId('w')` |
| `name` | `name` (entries without a string name are skipped and counted in the notice) |
| `wins` | integer ≥ 0, else 0 |
| `status` | `available`, `title-shot` or `used`, else `available` (original kept in `legacy.status`) |
| `champion` | `champion === true` |
| `notes` | `note` if string, else `""` |
| `legacy` | all other keys; omitted when empty |
| `week` (Universe) | `currentWeek` if integer ≥ 1, else 1 |

Rules:
- Legacy keys are never deleted and never written by the migration. Rollback = delete `wwe-universe-v2`.
- Idempotence comes from the existence of the v2 document. Backups are written only when the backup key is absent.
- Only version 1 → 2 is handled.
- Volumes: a few hundred entries at most. The migration is synchronous at startup.
- Integration: the app's `useEffect` writes to legacy keys and the call to `ensureCurrent` are wired in US-115.

## Universe store and persistence

Source: US-115.

**Module:** `universe/UniverseContext.jsx`
- `UniverseProvider` (in `main.jsx`, wrapping `App`) holds state with a lazy `useReducer(reducer, null, () => loadUniverse(localStorage))`.
- `useUniverse()` returns `{universe, dispatch, notice, saveError, readOnly, banners, pushBanner, dismissBanner, flushSave, dismissNotice}`.
- Reducer actions (camelCase, ID-based): `addWrestler {name, id}`, `removeWrestler {id}`, `setNotes {id, notes}`, `changeWins {id, amount}`, `cycleStatus {id}`, `toggleChampion {id}`, `setWeek {week}`, `replaceUniverse {universe, confirmed}`.
- `addWrestler` trims and uppercases the name; a case-insensitive duplicate is ignored. The caller injects `id` (`newId('w')`) so the reducer stays pure. New wrestlers start with `wins 0`, `status 'available'`, `champion false`, `notes ''`.
- `removeWrestler` writes the tombstone `formerWrestlers[id] = name` and keeps relationships and event references.
- `changeWins` clamps at 0. `cycleStatus` follows `available → title-shot → used → available`.
- `replaceUniverse` validates with `validateUniverse`, sanitises settings with `validateSettings` (AI forced off), is the only action allowed in read-only mode, and clears read-only when `confirmed` is true. All other actions are no-ops while read-only.

**Persistence**
- Key: `wwe-universe-v2` (`V2_KEY`).
- `saveUniverse(storage, universe)` returns `{ok, error?}` and wraps `setItem` in try/catch.
- `loadUniverse(storage)` is a thin wrapper over `ensureCurrent(storage)` in `universe/migrate.js` (US-114), which returns `{universe, notice?, readOnly?}`.
- Autosave: `useEffect` on `universe`. If `readOnly`, nothing is saved. Otherwise a `setTimeout` of 300 ms saves; the timer is cleared on change. Cleanup and `window` `pagehide` call the flush. The first render does not save.
- `saveError` is set when `saveUniverse` returns `{ok:false}` and cleared on the next success.
- `flushSave()` lets import force a save before taking a snapshot.

**Banners**
- `banners[]`, `pushBanner`, `dismissBanner` live in the provider. Warnings use `role="alert"`. Styles are in `.banner` in `index.css`.
- Used for the migration notice, the storage-error warning and the read-only warning.

**Known limitations**
- No multi-tab sync (last write wins).
- Views (`RosterTable`, `WrestlersManager`, `WeekInfo`, `MatchGenerator`) dispatch actions keyed by wrestler `id`; React `key` is `id`.
