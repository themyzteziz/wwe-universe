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

## FT-107 — Relationship model and profiles (US-118, US-119)

**Modules**: `universe/relationships.js` (pure: `stateOf`, `applyDelta`, `getRelationship`, `listFor`, `nameOf`, `RelationshipError`, threshold constants) + test; `components/universe/RelationshipProfile.jsx`, `WrestlerPicker.jsx` + RTL test. Schema gains optional `formerWrestlers {id:name}` (no version bump); `validateUniverse` enforces score range, no self-pairs, state consistent with score. Reducer gets `applyRelationshipDelta`; `removeWrestler` records a tombstone name when the wrestler has relationships and never deletes relationships.

**Data**: Relationship `{fromId,toId,score,state,history[]}` unique per ordered pair; HistoryEntry `{id,eventId?,matchId?,week,delta,scoreAfter,participantIds,reason}`. Thresholds: enemy ≤ −60, rival ≤ −20, ally ≥ 20, else neutral. History `delta` is the requested delta, `scoreAfter` the clamped result.

**Decisions**
| Decision | Reason | Alternatives |
|---|---|---|
| Path `universe/` and constants in `relationships.js` (not `src/…`, no `config.js`) | Repo has no `src/`; avoids a new config file | Follow story text literally |
| `formerWrestlers` name map for removed wrestlers | Keeps history readable without changing wrestler lists in all views | `former` flag on wrestler (touches every view); name snapshot on each relationship (breaks rename) |
| Pure functions return a new universe, throw `RelationshipError` | Easy to test, reducer-friendly | Mutating reducer-only logic |
| Profile shows outgoing relationships (X→other) | Directed model; matches “how X feels” | Merge both directions (hides asymmetry) |

**Risks**: removal action must write the tombstone before dropping the wrestler (test covers); UNIVERSE shell dependency may land later (mount point only, no competing shell).

## FT-108 Factions and storylines (US-120, US-121)

**Modules:** `universe/factions.js` (`canForm`, `formFaction`, `avgInternalScore`, `dissolutionCandidates`, `dissolveFaction`, `renameFaction`, `generateName`) and `universe/storylines.js` (`attachEvent`, `evaluateStatuses`). Pure state-in/state-out functions, called from the `UniverseContext` reducer; tests co-located (`*.test.js`). Paths use root `universe/` (no `src/`).

**Data model additions (optional fields, schemaVersion stays 2):** Faction `+formedWeek, dissolvedWeek?, dissolvedEventId?`; Storyline `+openedWeek, lastWeek, resolvedWeek?`, status `open|resolved|abandoned`. Dissolved factions are retained. Reducer actions `formFaction`, `dissolveFaction`, `renameFaction`.

**Rules:** faction 2–5 members, one active faction per wrestler, formation needs both-direction score ≥ 20 for all pairs, dissolution candidate when average internal score < 0 (never auto-dissolved; the player accepts a proposed event). Storyline opens on an accepted rival-type event, appends for the same open pair, resolves on respect/alliance, abandons after 8 weeks without events; proposed/rejected events never attach. Factions and storylines never change title or champion state.

**Decisions:** name word list = exported constants in `factions.js` (no settings UI; · simplest, "configurable" by editing; alt: settings field). Event type sets `RIVAL_TYPES`/`RESOLVE_TYPES` are constants to be aligned with the engine's event catalogue (assumption, open dependency). Randomness only via injected seeded rng.

**Risk:** event type names not fixed yet (Med/Low) → single constants, one place to change.

## FT-110 Event proposal flow (US-128, US-129, US-130)

**Modules:** `universe/proposals.js` (pure orchestration: `rollProposal`, `canPropose`, `latestResult`; uses selection, consequence and description modules of FT-109), reducer actions `proposeEvent`, `acceptEvent`, `rejectEvent`, `rerollEvent` and `recordResult` auto-trigger in `UniverseContext.jsx`; `components/universe/ProposalCard.jsx` (mounted in BOOKING and UNIVERSE); tests `universe/proposals.test.js`, `components/universe/ProposalCard.test.jsx`, `test/acceptance.test.jsx`, `test/fixtures/legacyRoster.json`. Root paths, no `src/`.

**Data:** no schema bump. The pending proposal is the single event with `state==='proposed'` (invariant enforced by `validateUniverse`); no `pendingEventId` stored. Optional Event field `suggestion {wrestlerId,status:'title-shot'}` and `tier`. Transient (unsaved) `lastRoll` for the "No event this time" toast.

**Flow:** record result → (autoPropose) roll → none | one proposed event → Accept (apply deltas with `eventId` history, attach storyline, faction change, state accepted) / Reject (state rejected, no effect) / Reroll (forced roll, excludes type+pair, replaces proposal, unlogged). Seed = hash(settings.seed, matchResult.id, rerollCount); no wall-clock in logic.

**Decisions**
| Decision | Reason | Alternatives |
|---|---|---|
| Pending derived from events, not stored id | One source of truth, persists automatically | Separate `pendingEventId` (can desync) |
| Reroll replaces, does not log | PO flow: only Reject is a decision; keeps cooldown data clean | Log rerolls as rejected |
| Title-shot suggestions need a separate confirm button, Accept never changes status | PO answer: explicit confirmation always | Apply on Accept |
| Acceptance tests in RTL/Vitest, headless loop via reducer | No Playwright (out of scope) | Browser tests |

**Risks:** engine signatures from FT-109 not final (Med/Med) → `proposals.js` is the only adapter; cooldown constant name to align; two proposals via double click/StrictMode (Low/Med) → reducer guard via `canPropose`.

## FT-111 — UNIVERSE view and settings (US-131, US-132, US-133)

**Modules**
| Path | Role | Story |
|---|---|---|
| `components/universe/UniverseView.jsx` | Sub-tab shell (Timeline, Relationships, Settings, Backup); local sub-tab state; pending-proposal badge on the UNIVERSE tab in `App.jsx` | US-131 |
| `components/universe/Timeline.jsx` + `universe/selectors.js` (`timelineEntries`) | Read-only chronological list, filters, 50/page | US-132 |
| `components/universe/SettingsPanel.jsx`, `DEFAULT_SETTINGS` + `validateSettings` in `schema.js`, reducer `UPDATE_SETTINGS`/`RESET_SETTINGS` | Settings editing and reset | US-133 |

**Data model:** no schema change; settings live in `state.settings` (`seed` is integer|null). `schemaVersion` unchanged.

**Key decisions**
- Sub-tab selection is local UI state, not persisted · reason: no value, keeps the schema stable · alternative: store in settings.
- Timeline is a pure selector over existing arrays (no derived/stored timeline) · reason: single source of truth, 500 entries is trivial with paging · alternative: stored feed.
- Proposed events are excluded from the timeline; they appear in the proposal UI (FT-110).
- Settings validated both in the UI and in the reducer (`validateSettings`), since import can supply bad data.

**Risks**
- Frequency 0 must be honoured by the engine/trigger (FT-109/110) — covered by a trigger-level test (low likelihood, medium impact).
- Relationships/Backup sub-tabs depend on other stories; shell uses placeholders until available (low).
