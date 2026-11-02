# Solution Design — WWE Universe AI Simulation (WUAS)

Scope of this revision: FT-105 (US-113, US-114, US-115), epic EP-101 foundation.

## Architecture overview
Static React 19 + Vite SPA (GitHub Pages, `base: /wwe-universe/`), no backend, state in `localStorage`. The player plays matches in WWE 2K26; the app only records and proposes. Introduce one new root folder `universe/` holding the data model, migration and a React context store. Existing views move from local `useState` in `App.jsx` to the shared store.

## Module map
| Path | Role | Story |
|---|---|---|
| `universe/schema.js` | types (JSDoc), `SCHEMA_VERSION`, `V2_KEY`, `newId`, `createEmptyUniverse`, `validateUniverse` | US-113 |
| `universe/migrate.js` | `migrateLegacy`, `ensureCurrent(storage)` | US-114 |
| `universe/UniverseContext.jsx` | provider, `useUniverse`, reducer, debounced autosave, banners state (storage helpers may live here) | US-115 |
| `main.jsx`, `App.jsx`, `components/*` | consume context; actions keyed by wrestler `id` | US-115 |
| `data/wrestlers.json` | seed roster for first run | existing |
Repo conventions: code at repo root (no `src/`), plain JS/JSX. Tests co-located as `*.test.js(x)`. New devDeps: `vitest`, `jsdom`, `@testing-library/*`; `npm test` added (checks remain lint + build + test).

## Data model (single JSON document at `wwe-universe-v2`)
Universe `{schemaVersion:2, week, wrestlers, matchResults, events, relationships, factions, storylines, settings}`.
- Wrestler `{id 'w_uuid', name, status 'available'|'title-shot'|'used', wins, champion, notes, legacy?}`
- MatchResult `{id, week, type '1v1'|'3MAN ELI'|'4MAN ELI', participantIds, winnerIds, recordedAt}`
- Event `{id, type, week, participantIds, state proposed|accepted|rejected, seed, deltas[], description, storylineId?, createdAt}`
- Relationship `{fromId, toId, score −100..100, state, history[]}` (directional)
- Faction `{id, name, memberIds, formedEventId, active}`; Storyline `{id, title, participantIds, eventIds, status}`
- Settings `{eventFrequency 25, chaos 50, historySensitivity 50, autoPropose true, seed}`
Legacy keys (read-only after migration): `wrestlers`, `currentWeek`; backups `*.backup-v1`; invalid v2 doc backup `wwe-universe-v2.invalid-backup`.

## API inventory (internal functions)
`newId(prefix)`, `createEmptyUniverse()`, `validateUniverse(obj) -> string[]`, `migrateLegacy(rawRoster, rawWeek)`, `ensureCurrent(storage) -> {universe, notice?, readOnly?}`, `saveUniverse(storage, u) -> {ok, error?}`, `useUniverse() -> {universe, dispatch, notice, saveError, dismissNotice}`. Reducer actions: addWrestler, removeWrestler, setNotes, changeWins, cycleStatus, toggleChampion, setWeek, replaceUniverse.

## Security model
Single local user, no auth. No secrets in bundle or storage. Input validated at boundaries (`validateUniverse` before import; migration tolerant of malformed legacy). Optional AI endpoint (later) is user-entered HTTPS, no keys stored. Titles/champions/title-shot status are never changed automatically; storyline events may only *suggest* title-shot changes that need explicit player confirmation (PO answer).

## Integration inventory
None required. Optional AI description hook only (template text default; no backend in v1).

## Key decisions
| Decision | Reason | Alternatives |
|---|---|---|
| Keep lowercase status values `available/title-shot/used` and map to labels in UI | Existing views/CSS use them; lossless migration | Capitalised enums from story text (would force view/CSS rewrite) |
| Wrestler field `notes` (migrated from legacy `note`) | Matches brief; single rename in views | Keep `note` (diverges from brief) |
| New root folder `universe/`, plain JS | Matches repo layout (no `src/`, no TS) | `src/universe` (repo has no `src`), TypeScript |
| One JSON document under `wwe-universe-v2` | Simple, atomic, export/import friendly | Per-entity keys; IndexedDB (out of scope) |
| Legacy keys never deleted or rewritten; backups with `.backup-v1` | Safe rollback = delete v2 key | Delete legacy after migration |
| Idempotence via presence of valid v2 doc | No flag needed | Separate migrated flag |
| `crypto.randomUUID()` for IDs, never name-derived | Rename-safe, collision-free | Counters, name slugs |
| Context + `useReducer`, debounced (300 ms) save with flush on pagehide | Already React-only; no new dependency | Redux/Zustand |
| Invalid/newer v2 doc → read-only mode, no overwrite | Never destroy user data | Reset to empty |
| Relationships directional per ordered pair | Rivalries can be asymmetric | Unordered pairs |

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Refactor of all views regresses behaviour | Med | High | Reducer unit tests + RTL tests; unchanged markup; manual `npm run dev` check |
| Duplicate-name legacy data breaks name-keyed code | Med | Med | Keys/actions by `id` everywhere |
| localStorage quota/disabled | Low | Med | try/catch, warning banner, in-memory operation |
| Vitest setup adds deps and config to a lint/build-only pipeline | Low | Low | Config in `vite.config.js`; `npm test` added; CI deploy workflow unaffected |
| `crypto.randomUUID` unavailable on insecure origin | Low | Med | GitHub Pages/localhost are secure contexts; tests run in Node ≥19 |
| StrictMode double init | Low | Low | Migration idempotent |
