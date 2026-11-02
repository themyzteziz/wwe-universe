# US-114: Migrate legacy localStorage roster to the Universe schema
**Status:** Ready for UAT · **Category:** data_migration · **Points:** 5 · **Sprint:** not set

## Summary
Existing players keep their roster, wins, statuses, champions and notes when the app upgrades to the Universe (v2) data format. The conversion runs once at startup and never deletes or changes the original localStorage data.

## What was built
- `universe/migrate.js` (new):
  - `migrateLegacy(rawRoster, rawWeek)`: pure conversion of the legacy `wrestlers` array and `currentWeek` value into a Universe. Returns `{universe, notice?}`.
  - `ensureCurrent(storage)`: startup entry point. Reads the v2 document, migrates legacy data, or seeds a new roster. Writes backups and never throws. Returns `{universe, notice?, readOnly?}`.
  - Constants: `LEGACY_ROSTER_KEY` (`wrestlers`), `LEGACY_WEEK_KEY` (`currentWeek`), backup suffix `.backup-v1`. `V2_KEY` (`wwe-universe-v2`) is exported from `universe/schema.js`.
- `universe/migrate.test.js` (new): tests for AC 1–9 using an in-memory storage stub and inline fixtures.

## How it works
- **AC 1 Lossless conversion:** each legacy wrestler becomes a Wrestler with a new `w_` ID. `name`, `wins`, `status`, `champion` and `notes` (from legacy `note`, including `"*"` and `"WILL RETURN"`) are carried over. `week` is the legacy `currentWeek` if it is a positive integer, otherwise 1.
- **AC 2 Idempotent:** once the v2 document exists, later runs return it. Nothing is re-migrated, so IDs and backups stay the same.
- **AC 3 Legacy preserved:** the legacy keys are read only. Backups `wrestlers.backup-v1` and `currentWeek.backup-v1` (if the week key exists) are written once, only when absent.
- **AC 4 Corrupt data:** invalid JSON or a non-array `wrestlers` value gives an empty Universe. The raw text goes to the backup and the result carries a `notice`. No exception is thrown.
- **AC 5 Duplicate names:** every entry is kept with its own ID.
- **AC 6 Extra fields and defaults:** keys other than `name, wins, note, status, champion` go under `legacy`. Missing `wins` is 0, missing `status` is `available`, missing `champion` is false, missing `note` is `""`. An unknown status becomes `available` and the original is kept in `legacy.status`. Entries without a string name are skipped and counted in the notice.
- **AC 7 No legacy data:** on a first run the roster is seeded from `data/wrestlers.json` (`note === "*"` gives status `used`, champion false). No backup and no notice.
- **AC 8 Existing v2 document:** a valid v2 document is returned unchanged and legacy keys are ignored. An invalid document or one with `schemaVersion > 2` is not overwritten. Its raw text is saved to `wwe-universe-v2.invalid-backup` (once), an empty Universe is returned with a `notice`, and `readOnly: true` tells the caller not to save.
- **AC 9 Fixtures:** tests cover an empty roster, a full roster with a champion and every status, duplicate names, corrupt JSON and extra fields.

## How to test
Automated (all must pass):
- `npm run lint --silent`
- `npm run test --silent`
- `npm run build --silent`

Manual checks (browser console, once US-115 wires `ensureCurrent` into the app; before that, use a dev import):
- AC 1: put a legacy `wrestlers` array and `currentWeek` in localStorage, delete `wwe-universe-v2`, run `ensureCurrent(localStorage)`. **Verify:** `wwe-universe-v2` has the same N wrestlers with `w_` ids and identical name/wins/status/champion/notes; week matches.
- AC 2: run it again. **Verify:** the stored document and backups are unchanged.
- AC 3: **Verify:** `wrestlers` and `currentWeek` are unchanged and `*.backup-v1` hold identical strings.
- AC 4: set `wrestlers` to `{bad`. **Verify:** empty roster, `wrestlers.backup-v1` = `{bad`, result has a `notice`, no exception.
- AC 5/6: add duplicate names and extra fields. **Verify:** both kept with distinct ids; extras under `legacy`; unknown status → `available` with `legacy.status`.
- AC 7: clear all keys. **Verify:** roster equals `data/wrestlers.json`, no backup, no notice.
- AC 8: store an invalid or `schemaVersion: 3` v2 document. **Verify:** it is not overwritten, a notice and `readOnly: true` are returned.

## Deployment notes
- **Pre-deploy steps:** none.
- **Post-deploy steps:** none in this story. Legacy keys stay in place, so rollback is safe.
- **Configuration:** none.
- **Rollback:** delete `wwe-universe-v2` from localStorage. The legacy data is intact and is migrated again on the next start.
- Tag: no `Manual step` tag. The manual console checks above are verification only.

## Known limitations
- Only migration from version 1 to version 2 is supported. Migration from future versions is out of scope.
- No remote backups.
- The migration does not write the legacy keys. Stopping the app's writes to them (`useEffect` in `App.jsx`) is part of US-115.
- Notices are returned as plain strings. Showing them in the UI is part of US-115.
- Until US-115 is merged, `ensureCurrent` is not called at app startup, so the manual checks need a dev import.
- No screenshot evidence or test report. The story has no UI page, so QA evidence is file-based (static review, `run_checks` passed).
