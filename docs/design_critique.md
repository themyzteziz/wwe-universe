# Design critique — WUAS

**Verdict: revise.** Issues are ranked within each perspective. Items marked **(blocking)** would cause rework or a defect if built as designed.

## 1. Architecture

1. **(blocking) FT-112 contradicts the repo layout.** It lists `src/universe/exportImport.js`, `src/components/...` and `src/sim/aiProvider.js`. The overview, FT-107, FT-108, FT-109 and FT-110 all say root paths with no `src/`, and the sim lives in `universe/sim/`. Change FT-112 to `universe/exportImport.js`, `components/universe/BackupPanel.jsx`, `components/Banner.jsx`, `components/ErrorBoundary.jsx` and `universe/sim/aiProvider.js`.
2. **(blocking) Two orchestrators and a naming clash for the proposal pipeline.** FT-109 has `engine.proposeEvent`, `consequences.addProposal`, `consequences.rejectEvent` and `applyEvent`. FT-110 adds `proposals.rollProposal` plus reducer actions `proposeEvent` and `rejectEvent`. Name one owner: `engine.js` rolls and builds, `proposals.js` only adapts to the reducer, and reducer action types are distinct constants. Also fix the reducer action style. The overview uses camelCase (`replaceUniverse`), FT-111 uses `UPDATE_SETTINGS`, and FT-107 uses `applyRelationshipDelta`. Pick one convention.
3. **(blocking) `DEFAULT_SETTINGS` has three homes.** The overview says it lives in the settings shape in `schema.js`. FT-109 puts it in `sim/config.js` and has `schema.js` import it. FT-111 says it and `validateSettings` are in `schema.js`. FT-112 adds `aiEnabled` and `aiEndpoint`. Pick `sim/config.js` or `schema.js`, not both, and avoid a cycle: `schema.js` → `sim/config.js` → `relationships.js` → `schema.js`. FT-107 also has `validateUniverse` import relationship thresholds, which creates the same cycle. Put thresholds and defaults in a leaf module with no imports.
4. **Title-shot suggestions have no owner.** The PO answer requires events to be able to suggest title-shot changes, with explicit confirmation. FT-109 defers them to a "later story" as `suggestions[]`. FT-110 uses a singular `suggestion {wrestlerId,status}` plus a "separate confirm button". No story generates a suggestion, and nothing defines the reducer action that confirms one. That action is the only code allowed to write wrestler status. Add a story or an AC (generation rule, `suggestions[]` shape, `confirmSuggestion` action, proof that Accept never changes status). Align the field name across FT-109 and FT-110.
5. **Reroll seed is defined two ways.** FT-109: `deriveSeed(prevSeed, attempt≥1)`. FT-110: `hash(settings.seed, matchResult.id, rerollCount)`. Also, `rerollCount` is stored nowhere, since rerolls are unlogged, so it is lost on reload. Choose one formula and say where the count lives (for example, store `rerollCount` on the proposed event).
6. Low: FT-108's `RIVAL_TYPES`/`RESOLVE_TYPES` are called "constants in factions.js" and also "read from sim/config.js". Keep only the config one.

## 2. Security and data

1. **(blocking) Import can plant an AI endpoint.** FT-112 adds `aiEnabled` and `aiEndpoint` to settings, and import replaces the whole universe. A shared export file could set an attacker's HTTPS endpoint with `aiEnabled:true`. Participant names and facts would then be POSTed on the next description. Fix: on import, force `aiEnabled=false` and clear `aiEndpoint` (or require explicit re-confirmation). Validate that the endpoint is `https:` in `validateSettings` and in the reducer, not only in the UI.
2. **Export reads raw localStorage (FT-112), but quota or disabled storage means in-memory-only operation (overview).** Exports would then miss the unsaved state. Export from the in-memory universe by default and use raw storage only when state is flagged invalid or read-only.
3. **Read-only mode versus import is not specified.** If the v2 doc is invalid or newer, writes are blocked. State whether import is the way out and, if so, how it passes the read-only guard. Otherwise the player is stuck.
4. **Pre-import snapshot.** A single raw copy doubles storage use against a roughly 5 MB quota, and "abort on quota failure" blocks import for large universes. Also say that the debounced save is flushed before the snapshot is taken, so the snapshot isn't stale. Note the 5 MB import cap is a real limit.
5. Low: no `storage` event handling, so two tabs can overwrite each other. Accept it explicitly as a known limitation, or add a `storage` listener to switch to read-only.
6. Low: the removal tombstone (`formerWrestlers`) is not covered by migration, import or validation. Make `validateUniverse` check that every id referenced in relationships, events, factions or storylines resolves to a wrestler or a tombstone.

## 3. Delivery and testability

1. **(blocking) Vitest ownership and order.** The overview says FT-105 adds the vitest devDeps, `npm test` and the React 19 upgrade. US-116 (FT-106) owns the upgrade and test setup. US-113…US-115 need tests first. Make US-116 the first story, or move the tooling into FT-105, and set the delivery order explicitly: US-116 → FT-105 → FT-107/108 → FT-109 → FT-110 → FT-111/112.
2. **The checks gate does not include tests until US-138.** Team checks are `lint` and `build`. All "tests prove the AC" claims go unenforced until `npm test` is in `run_checks`/CI. Put `npm test` in the checks script in US-116.
3. **Dependency cycle risk.** FT-109 `applyEvent` needs FT-107's `applyDelta` and FT-108's `formFaction`/`attachEvent`. FT-108 needs the FT-109 type constants. Fix the build order (constants first, in the leaf module from Architecture 3), and have the developer confirm signatures before coding. The design already notes this as a Med/Med risk but gives no sequence.
4. **Determinism tests.** The seed includes `matchResult.id`, which is a random UUID. Replay tests must inject ids and clocks. Say so in US-130, and fix `settings.seed=null` behaviour. `defaultSeed` is non-deterministic, so the chosen seed must be stored on the event.
5. Frequency 0 versus the manual "Generate event" button: say whether the manual button bypasses the frequency roll (it should). Add this to the FT-110 tests.
6. Low: the layout (360 px) AC cannot be proven in jsdom, and the design accepts a manual check. Record it as a manual step in how-to-test.

## Summary
Blocking: FT-112 paths, orchestrator and action naming, the settings defaults home and cycle, missing title-shot suggestion story, import and AI endpoint exfiltration, test tooling order. The rest are fixable notes.
