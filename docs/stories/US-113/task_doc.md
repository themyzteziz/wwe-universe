# US-113: Define versioned Universe data schema with stable wrestler IDs
**Status:** Ready for UAT · **Category:** development · **Points:** 3 · **Sprint:** —

## Summary
Wrestlers now get an ID that is generated once and never derived from the name, so renaming a wrestler no longer breaks links to relationships, events and history. The universe document carries a `schemaVersion` (2) and a validator that checks structure and referential integrity.

## What was built
- `universe/constants.js`: leaf module with thresholds (`SCORE_MIN`, `SCORE_MAX`, `ENEMY_MAX`, `RIVAL_MAX`, `ALLY_MIN`), status and event vocabularies, `DEFAULT_SETTINGS` and `validateSettings(partial)`.
- `universe/schema.js`: JSDoc typedefs, `SCHEMA_VERSION = 2`, `V2_KEY = 'wwe-universe-v2'`, `newId(prefix)`, `createEmptyUniverse(now?)`, `validateUniverse(obj)`.
- `universe/constants.test.js`, `universe/schema.test.js`: Vitest unit tests for AC 1–4, settings validation, referential integrity and tombstone (former wrestler) checks.
- `eslint.config.mjs`: replaced the broken Next.js config with the flat config from US-116 (recommended rules, react-hooks, react-refresh, test globals).

## How it works
- **AC 1 – Empty universe:** `createEmptyUniverse()` returns `schemaVersion` 2, `week` 1, six empty arrays (`wrestlers`, `matchResults`, `events`, `relationships`, `factions`, `storylines`) and `settings` equal to `DEFAULT_SETTINGS` with an integer `seed`.
- **AC 2 – Stable IDs:** `newId('w')` returns `w_` + UUID. Two wrestlers with the same name get different IDs. Renaming changes `name` only; references by `id` stay valid.
- **AC 3 – Validation:** `validateUniverse(obj)` returns a list of plain-text errors and never throws (including for `null`). It reports wrong `schemaVersion`, missing arrays, dangling references to unknown IDs (IDs must resolve to a wrestler or a `formerWrestlers` key), duplicate wrestler IDs, and more than one event in state `proposed`. Valid data returns `[]`.
- **AC 4 – Notes separate:** Wrestler has a string `notes` field; no other entity has a `notes` field.

## How to test
Checks: `npm run lint --silent`, `npm run test --silent`, `npm run build --silent`. Unit tests only: `npx vitest run universe`.
- **AC 1:** `createEmptyUniverse()` has schemaVersion 2, week 1, six empty arrays and default settings with an integer seed. **Verify:** unit test in `universe/schema.test.js` passes.
- **AC 2:** Two `newId('w')` calls differ and start with `w_`; renaming a wrestler keeps its id and `validateUniverse` still returns `[]`. **Verify:** unit test passes.
- **AC 3:** `validateUniverse(null)` returns one error without throwing; dangling IDs, duplicate IDs and two proposed events each produce errors; valid data returns `[]`. **Verify:** unit test passes.
- **AC 4:** Only the Wrestler typedef in `universe/schema.js` has `notes`. **Verify:** unit test (reads source via `?raw`) passes.

## Deployment notes
- No migration, configuration or manual steps. The schema is not yet wired into the UI; the legacy roster is unchanged.
- Requires US-116 (Vitest, React 19 tooling) to be installed; it already is on this branch.

## Known limitations
- Migration from the legacy `wrestlers`/`currentWeek` shape (`note` → `notes`) is out of scope and handled by a separate story.
- No UI changes.
- The AC 4 test inspects typedef source text, which is a weak check.
- Event-type, relationship-state and storyline-status vocabularies beyond the constants are validated only as strings; later stories define them.
