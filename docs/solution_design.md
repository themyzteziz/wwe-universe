# Solution Design — WWE Universe AI Simulation (WUAS)

Scope of this revision: FT-105 (US-113, US-114, US-115), epic EP-101 foundation.

## Architecture overview
Static React 19 + Vite SPA (GitHub Pages, `base: /wwe-universe/`), no backend, state in `localStorage`. The player plays matches in WWE 2K26; the app only records and proposes. Introduce one new root folder `universe/` holding the data model, migration and a React context store. Existing views move from local `useState` in `App.jsx` to the shared store.

## Module map

| Path | Role | Story |
|---|---|---|
| `universe/constants.js` | leaf (no imports): thresholds, statuses, event type names, `RIVAL_TYPES`/`RESOLVE_TYPES`, `DEFAULT_SETTINGS`, `validateSettings` | US-113 |
| `universe/schema.js` | types (JSDoc), `SCHEMA_VERSION`, `V2_KEY`, `newId`, `createEmptyUniverse`, `validateUniverse` (incl. referential checks) | US-113 |
| `universe/migrate.js` | `migrateLegacy`, `ensureCurrent(storage)` | US-114 |
| `universe/UniverseContext.jsx` | provider, `useUniverse`, reducer, debounced autosave, banners state (storage helpers may live here) | US-115 |
| `main.jsx`, `App.jsx`, `components/*` | consume context; actions keyed by wrestler `id` | US-115 |
| `data/wrestlers.json` | seed roster for first run | existing |
Repo conventions: code at repo root (no `src/`), plain JS/JSX. Tests co-located as `*.test.js(x)`. Test tooling (`vitest`, `jsdom`, RTL, `npm test`, `test:run`) is owned by US-116 and lands before FT-105; checks are lint + test:run + build (see R1). Full later-module map: R1 and the FT sections.

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

**Modules:** `universe/proposals.js` (thin adapter only: `canPropose`, `latestResult`, `reduceProposal`; all rolling is `sim/engine.js` `rollEvent`, see R1), reducer actions `generateEvent`, `acceptEvent`, `rejectEvent`, `rerollEvent`, `confirmSuggestion`, `dismissSuggestion`, `recordResult` auto-trigger in `UniverseContext.jsx`; `components/universe/ProposalCard.jsx` (BOOKING and UNIVERSE); tests `universe/proposals.test.js`, `components/universe/ProposalCard.test.jsx`, `test/acceptance.test.jsx`, `test/fixtures/legacyRoster.json`.

**Data:** no schema bump. Pending proposal = the single event with `state==='proposed'` (enforced by `validateUniverse`). Event fields used: `matchId`, `seed`, `rerollCount` (stored), `suggestions[]`, `tier`. Transient `lastRoll` for the "No event this time" note.

**Flow:** record result → (autoPropose) roll → none | one proposed event → Accept (deltas with `eventId` history, storyline, faction, state accepted; suggestions untouched) / Reject / Reroll (forced, excludes type+pair, replaces proposal, `rerollCount+1`, old one not logged) / Confirm or Dismiss suggestion (separate controls after Accept). Manual Generate is forced (ignores frequency, including 0). Seed per R1.

**Decisions**
| Decision | Reason | Alternatives |
|---|---|---|
| Pending derived from events | single source of truth | `pendingEventId` |
| Reroll replaces, does not log | only Reject is a decision | log rerolls |
| `confirmSuggestion` is a separate action and button | PO: explicit confirmation always | apply on Accept |
| `rerollCount` and `seed` stored on the event | reload-safe, replayable | transient counter |
| Acceptance tests in RTL/Vitest with injected ids/clock/seed | deterministic, no Playwright | browser tests |

**Risks:** FT-109 signatures (Med/Med) → `proposals.js` is the only adapter and developer confirms signatures first; double proposal via double click/StrictMode (Low/Med) → `canPropose` guard in reducer.

## FT-111 — UNIVERSE view and settings (US-131, US-132, US-133)

**Modules**
| Path | Role | Story |
|---|---|---|
| `components/universe/UniverseView.jsx` | Sub-tab shell (Timeline, Relationships, Settings, Backup); local sub-tab state; pending-proposal badge on the UNIVERSE tab in `App.jsx` | US-131 |
| `components/universe/Timeline.jsx` + `universe/selectors.js` (`timelineEntries`) | Read-only chronological list, filters, 50/page | US-132 |
| `components/universe/SettingsPanel.jsx`; reducer actions `updateSettings`/`resetSettings` | Settings editing and reset; `DEFAULT_SETTINGS` and `validateSettings` come from `universe/constants.js` (US-113), not `schema.js` | US-133 |

**Data model:** no schema change; settings live in `state.settings` (`seed` integer|null; AI fields per FT-112, edited in the same panel).

**Key decisions**
- Sub-tab selection is local UI state · no persistence value.
- Timeline = pure selector over existing arrays; proposed events excluded.
- Settings validated in the UI and in the reducer via `validateSettings` (import can supply bad data); `aiEndpoint` must be `""` or https.

**Risks**
- Frequency 0 must be honoured by the roll but not by the manual button (R1) — trigger-level tests in FT-110.
- Relationships/Backup sub-tabs depend on other stories; placeholders until available.

## FT-109 — Simulation engine core (US-122…US-127)

**Modules** (`universe/sim/`, pure JS, no I/O, tests co-located; see R1 for ownership):
| Path | Role | Story |
|---|---|---|
| `rng.js` | mulberry32 `createRng`, `deriveSeed`, `defaultSeed` | US-122 |
| `config.js` | `TIERS`, `EVENT_TYPES` (roles, relationRule, deltas), cooldown and `SUGGESTION_MIN_STORYLINE_EVENTS`, `validateConfig`; imports `../constants.js` (which owns `DEFAULT_SETTINGS`, `RIVAL_TYPES`, `RESOLVE_TYPES`) | US-123, US-126 |
| `eligibility.js` | `getEligibleCandidates`, `isOnCooldown` | US-124 |
| `select.js` | `selectEvent`, `computeWeights` | US-125 |
| `consequences.js` | `buildProposal` (incl. `suggestions[]`), `addProposal`, `applyEvent`, `rejectProposal`, `EventStateError` | US-126 |
| `describe.js` | templates + `describeEvent` | US-127 |
| `engine.js` | `rollEvent` — the single orchestrator (roll → select → build → describe) | US-127 |

**Pipeline**: `rollEvent` creates `rng(seed)` with the seed formula of R1; frequency roll (skipped when `forced`) → weighted pick (`p = (1−chaos)·tier·(1+s·history) normalised + chaos/n`) → deltas with chaos jitter (≤ ±25%) → description from sub-stream `deriveSeed(seed,0)`. Same state+settings+seed ⇒ same event (excluding `id`, `createdAt`). `Math.random` and `Date.now` are forbidden in `universe/sim` except `defaultSeed`/injected `now` (grep test).

**Data model additions** (optional, schemaVersion stays 2): Event `deltas[]` element `{fromId,toId,delta,applied,scoreBefore,scoreAfter,beforeState,afterState}`; Event `+payload?{factionName}`, `+matchId`, `+rerollCount`, `+suggestions[]` (R1). Proposed events are stored in `events` and count for cooldowns.

**Rules**: candidates are role-ordered; stale preview makes `applyEvent` throw; faction acceptance all-or-nothing; `return` catalogued, never generated in v1. Accepted events: relationships via `applyDelta`, storyline via `attachEvent`, faction via `formFaction`. `applyEvent` never writes wins/champion/status; it ignores `suggestions`.

**Build order inside the feature** (avoids the cycle): `constants.js` (US-113) → `relationships.js` (US-118) → `factions.js`/`storylines.js` (US-120/121; read type sets from `constants.js`) → `sim/config.js` → engine modules.

**Decisions**
| Decision | Reason | Alternatives |
|---|---|---|
| `universe/sim/`, not `src/sim/` | repo has no `src/` | story paths |
| Templates inside `describe.js`; one `engine.js` | fewer files; one orchestrator | separate templates; UI orchestration |
| Chaos lerps probabilities to uniform | simple, monotone | tier exponent |
| Description on separate RNG sub-stream | text never alters deltas | shared stream |
| Rejected count half in cooldowns; pending full | prevents duplicates | ignore rejected |
| Pair cooldown = 2× type cooldown | tunable assumption | separate tuning |
| `DEFAULT_SETTINGS` in `constants.js` (not `sim/config.js`) | leaf module, no import cycle | schema or config |

**Risks**
| Risk | L/I | Mitigation |
|---|---|---|
| FT-107/108 signatures differ from assumed | Med/Med | build order above; developer confirms signatures first; wrap in `consequences.js` |
| Candidate explosion | Low/Med | cap 200, stable order |
| Flaky statistical tests | Low/Low | fixed seed sweeps |
| Tuning feels off | Med/Low | weights in `config.js` |

## FT-112 — Backup, optional AI text and release quality (US-134…US-138)

**Modules** (root paths, no `src/`): `universe/exportImport.js` (serialize, parseImport, applyImport) · `components/universe/BackupPanel.jsx` · `universe/sim/aiProvider.js` · `components/ErrorBoundary.jsx` · `components/Banner.jsx` · CI workflow test step.

**Data model**: no new entities. Settings gain `aiEnabled:boolean=false`, `aiEndpoint:string=""` (defined in `universe/constants.js`, see R1). Export adds `exportedAt` (ISO), stripped on import, and omits the AI settings. Extra key `wwe-universe-v2.pre-import` (single slot).

**API (internal)**: `serializeUniverse(u, now) -> {filename,text}`; `parseImport(text) -> {universe}|{errors[]}` (forces AI off); `applyImport(...)`; `enhanceDescription(event, facts, settings, fetchImpl) -> {text, usedAi, notice?}`; reducer `replaceUniverse {universe, confirmed}`, banners `pushBanner/dismissBanner`.

**Integration**: optional user-supplied HTTPS endpoint, POST `{type, participants[names], facts[]}` → `{text}`; 10 s AbortController; `credentials:'omit'`; any failure falls back to template; text never touches deltas.

**Security**: import is untrusted (5 MB cap, full validation incl. referential checks before any write, React-escaped rendering); import cannot set AI settings; endpoint validated as https in `validateSettings` and in the reducer; no API-key fields; error boundary never writes or deletes storage.

**Decisions**
- Import = replace with confirmation + pre-import snapshot (flush first; quota failure → explicit second confirm) · protects data · merge import out of scope.
- Import is the exit from read-only mode (R1).
- Export from in-memory state; raw stored string only when read-only · reflects unsaved state.
- Collect all validation errors · actionable.
- Legacy roster accepted through the existing migration chain.
- One shared Banner via provider state.
- CI: add the test step to the existing job only.

**Risks**: snapshot quota failure (medium/low, handled by second confirm); CORS rejection by user endpoint (falls back, notice); 360 px layout manual check; workflow content not inspected by architect (developer diffs); `base` misconfiguration breaks Pages assets (verify dist/index.html); two-tab overwrite (accepted).

## Revision R1 — decisions from the design critique (authoritative)

This section overrides any conflicting statement elsewhere in this document and in story specs.

### Delivery order and checks
`US-116 → FT-105 (US-113, US-114, US-115) → US-117 → FT-107 (US-118, US-119) → FT-108 (US-120, US-121) → FT-109 (US-122…US-127) → FT-110 (US-128, US-129, US-130) → FT-111 (US-131…US-133) → FT-112 (US-134, US-135, US-137, US-136, US-138)`.
- **US-116 is the only owner** of React 19, Vitest, jsdom, RTL, `vitest.setup.js` and the `test`/`test:run` scripts. FT-105 adds no tooling; its tests run on the US-116 setup.
- **Checks from US-116 onward**: `npm run lint --silent`, `npm run test:run --silent`, `npm run build --silent`. US-116 adds a `check` script chaining the three; the team `run_checks` command must include `test:run` from that story (not from US-138). US-138 only adds the CI step.

### Module ownership (no cycles)
Import direction is one-way: `constants.js` (leaf, imports nothing) ← `schema.js`, `relationships.js`, `factions.js`, `storylines.js`, `sim/*` ← `proposals.js` ← `UniverseContext.jsx`.
| Item | Single home |
|---|---|
| `SCORE_MIN/MAX`, `ENEMY_MAX −60`, `RIVAL_MAX −20`, `ALLY_MIN 20`, `STATUSES`, `EVENT_TYPE_NAMES`, `RIVAL_TYPES`, `RESOLVE_TYPES`, `DEFAULT_SETTINGS`, `validateSettings` | **`universe/constants.js`** (new, leaf, created in US-113) |
| `TIERS`, `EVENT_TYPES` (roles, deltas, relation rules), cooldown and suggestion constants | `universe/sim/config.js` (imports `constants.js`) |
| `validateUniverse`, `SCHEMA_VERSION`, `V2_KEY`, `newId` | `universe/schema.js` (imports `constants.js` only) |
`DEFAULT_SETTINGS` = `{eventFrequency:25, chaos:50, historySensitivity:50, autoPropose:true, seed:null, aiEnabled:false, aiEndpoint:""}`. `validateSettings(partial) -> {ok, errors, value}` also requires `aiEndpoint` to be `""` or a parseable `https:` URL. `RIVAL_TYPES = [ambush, confrontation, betrayal, interference]`, `RESOLVE_TYPES = [respect, faction]` (assumption; US-123 must not redefine them).

### One proposal pipeline
| Layer | Names | Owns |
|---|---|---|
| `sim/engine.js` | `rollEvent(universe, matchResult, {forced, excludeKey, rerollCount, attempt}) -> {event}|{noEvent:true}` | the only roll → select → build → describe orchestrator (old `proposeEvent` is renamed) |
| `sim/consequences.js` | `buildProposal`, `addProposal`, `applyEvent`, `rejectProposal` (old pure `rejectEvent` renamed) | deltas, state transitions |
| `proposals.js` | `canPropose`, `latestResult`, `reduceProposal(universe, action)` | thin adapter: guards + calls into engine/consequences; no selection or seed logic |
| `UniverseContext.jsx` | reducer | dispatches only |
**Reducer action convention: camelCase verbs, one set** — `addWrestler, removeWrestler, setNotes, changeWins, cycleStatus, toggleChampion, setWeek, recordResult, generateEvent, acceptEvent, rejectEvent, rerollEvent, confirmSuggestion, dismissSuggestion, applyRelationshipDelta, formFaction, dissolveFaction, renameFaction, updateSettings, resetSettings, replaceUniverse`. (`UPDATE_SETTINGS`/`RESET_SETTINGS` are replaced by `updateSettings`/`resetSettings`.) Action types are strings; pure function names above are distinct from them.

### Seed and replay
- `recordResult` payload carries injected `{id, recordedAt, seed}`; the dispatching hook generates them (`newId('m')`, `Date.now()`, `defaultSeed()`); the reducer never calls clocks or `Math.random`. MatchResult gains `seed`.
- `base = settings.seed ?? matchResult.seed`; `attempt` = number of stored events with the same `matchId` (0 for the first roll; makes repeated manual generation differ); roll seed = `deriveSeed(deriveSeed(base, attempt), rerollCount)`.
- Event stores `matchId`, `seed` (the final roll seed) and `rerollCount` (0 for a fresh roll, previous+1 for a reroll). Hence reload-safe and replayable. The reroll formula of FT-109 (`deriveSeed(prevSeed, attempt)`) and FT-110 (hash with matchResult.id) are both withdrawn.
- Replay tests inject ids, `recordedAt` and seed through action payloads (US-130).
- Manual "Generate event" is `forced:true`: it bypasses the frequency roll (also at frequency 0) but still respects eligibility and the single-pending rule.

### Title-shot suggestions (owned by US-126, US-128, US-129)
- Event field is **`suggestions[]`** (plural, max 1 element in v1): `{id, wrestlerId, status:'title-shot', reason, state:'pending'|'confirmed'|'dismissed'|'stale'}`. The singular `suggestion` is withdrawn.
- Generation (US-126, `buildProposal`, deterministic, no rng): when the event type is in `RIVAL_TYPES` and the pair's open storyline already has ≥ `SUGGESTION_MIN_STORYLINE_EVENTS` (2, `sim/config.js`) accepted events, and the role-`a` wrestler has `status==='available'` and `champion===false` → one suggestion for that wrestler. Assumption, tunable; flagged for the PO.
- `applyEvent`/`acceptEvent` ignore `suggestions`. Only reducer action `confirmSuggestion {eventId, suggestionId}` may write `wrestler.status` (sets `'title-shot'`), and only when the event is `accepted`, the suggestion is `pending`, and the wrestler is still `available` and not champion; otherwise the suggestion becomes `stale` and nothing changes. `dismissSuggestion` sets `dismissed`. Champion flag and titles are never written.
- Proof: tests that Accept leaves `status` unchanged for every wrestler; `confirmSuggestion` is the only writer of `status` besides the manual `cycleStatus`.

### Import, AI endpoint and read-only mode
- `parseImport` forces `settings.aiEnabled=false` and `settings.aiEndpoint=""` whatever the file says; the reducer (`replaceUniverse`, `updateSettings`) re-validates through `validateSettings` and sanitises, so the rule holds even if the UI is bypassed. Export omits `aiEnabled`/`aiEndpoint` too, so shared files never carry an endpoint. The player re-enters the endpoint after import.
- Export serialises the **in-memory** universe. Only when the provider is `readOnly` (invalid/newer stored document) does export offer the raw stored string.
- **Import is the way out of read-only**: `replaceUniverse {universe, confirmed:true}` is the only action that bypasses the read-only guard; on success `readOnly` is cleared. The invalid document is first kept in the snapshot slot.
- Snapshot: flush the debounced save (when not read-only), then write the raw string to `wwe-universe-v2.pre-import` (single slot). If that write fails (quota), the player gets a second confirm "A safety copy could not be stored. Export your current data first or import anyway" — never a silent block. 5 MB file cap stays.
- Multi-tab: no `storage` listener; last write wins. Accepted, documented known limitation.
- `validateUniverse` checks referential integrity: every id referenced by relationships, events, factions, storylines, matchResults resolves to a wrestler or a `formerWrestlers` tombstone; `formerWrestlers` is optional (default `{}`), covered by migration and import. `removeWrestler` writes the tombstone and keeps relationships (supersedes the US-115 text that deleted them).

### Other
- Windows layout (360 px) cannot be proven in jsdom: recorded as a manual check in US-137 how-to-test.
- Rejected-finding notes: none; all findings accepted.
