# US-115: Universe persistence layer and React state provider
**Status:** Ready for UAT · **Category:** development · **Points:** 5 · **Sprint:** not recorded

## Summary
All universe changes are now saved automatically (debounced 300 ms) and reloaded after a page refresh. BOOKING and WRESTLERS read and write through one shared store, so future views can use the same data. If storage fails or the stored document cannot be read, the app keeps running and shows a warning banner.

## What was built
- `universe/UniverseContext.jsx`: `UniverseProvider` and `useUniverse()` (exposes `universe`, `dispatch`, `notice`, `saveError`, `readOnly`, `banners`, `pushBanner`, `dismissBanner`, `flushSave`, `dismissNotice`).
- Reducer with ID-based actions: `addWrestler`, `removeWrestler`, `setNotes`, `changeWins`, `cycleStatus`, `toggleChampion`, `setWeek`, `replaceUniverse`.
- `saveUniverse(storage, universe)` returns `{ok, error?}` and writes under key `wwe-universe-v2`.
- `loadUniverse(storage)`: thin wrapper over `ensureCurrent` from `universe/migrate.js` (US-114).
- `main.jsx`: `<App />` wrapped in `<UniverseProvider>`.
- `App.jsx`: legacy `localStorage` loading and effects removed; reads week and wrestlers from context; renders banners.
- `components/RosterTable.jsx`, `WrestlersManager.jsx`, `WeekInfo.jsx`, `MatchGenerator.jsx`: dispatch actions keyed by wrestler `id`; field `note` renamed to `notes`.
- `index.css`: `.banner` styles.
- `universe/UniverseContext.test.jsx`: reducer, provider and App tests.
- `App.test.jsx`: wrapped in `UniverseProvider`; `localStorage` cleared between tests.

## How it works
- **AC 1 Load:** On start the stored document is loaded once through `ensureCurrent`. A migration notice, if any, appears in a dismissible banner.
- **AC 2 Autosave:** Every dispatched change is written to `wwe-universe-v2` after a 300 ms debounce. After a reload the change is still there with the same ID.
- **AC 3 Storage error:** If `setItem` throws (quota or disabled), the app keeps working in memory. A `role="alert"` banner says changes may not be saved.
- **AC 4 Existing views:** BOOKING and WRESTLERS keep their behaviour: duplicate-name check, uppercase names, remove with confirm, note edit, wins +/− (minimum 0), status cycle `available → title-shot → used → available`, champion toggle, week change, match generation from the roster.
- **AC 5 Read-only:** If `ensureCurrent` returns `readOnly` (invalid or newer-version document), a warning banner is shown and nothing is written. Only `replaceUniverse` with `confirmed: true` is accepted and clears read-only mode; all other actions are no-ops.
- **AC 6 Flush on leave:** A pending save is flushed on `pagehide` and on unmount, so a quick refresh keeps the last change.
- Removing a wrestler writes a tombstone (`formerWrestlers[id] = name`) so existing references stay resolvable. Relationships and event references are kept.

## How to test
- Checks: `npm run lint --silent`, `npm run test --silent`, `npm run build --silent`.
- Unit tests: `npx vitest run universe`.
- AC 1 **Verify:** start with no data → roster shown; with a corrupt `wrestlers` key → dismissible info banner.
- AC 2 **Verify:** add a wrestler, wait 0.3 s, reload → wrestler still there; `wwe-universe-v2` contains it.
- AC 3 **Verify:** make `localStorage.setItem` throw → warning "Changes may not be saved"; app keeps working.
- AC 4 **Verify:** BOOKING/WRESTLERS: add (uppercase, duplicate alert), remove with confirm, note edit, wins +/−, status cycle, champion toggle, week change, Generate Match.
- AC 5 **Verify:** set `wwe-universe-v2` to `{bad` and reload → warning banner; key unchanged after edits.
- AC 6 **Verify:** change then refresh immediately → change is kept.

## Deployment notes
- No manual steps. No configuration. Storage key: `wwe-universe-v2`.
- Build artefacts under `dist/` are committed on the branch. Consider adding `dist/` to `.gitignore`.

## Known limitations
- No multi-tab sync: last write wins.
- No IndexedDB; the store uses `localStorage` only.
- Storage is expected to stay well below 5 MB.
