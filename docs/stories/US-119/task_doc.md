# US-119: Relationship profile view per wrestler
**Status:** Ready for UAT · **Category:** development · **Points:** 3 · **Sprint:** —

## Summary
Players can now select a wrestler and see their allies, rivals, enemies and neutral relationships, grouped and sorted by strength, with the explanation history for each relationship. The view is read-only and is rebuilt from the stored universe, so it is the same after a reload. It is available on a temporary PROFILES page until the UNIVERSE navigation shell is merged.

## What was built
- `components/universe/RelationshipProfile.jsx` — profile view (`wrestlerId` prop). Groups relationships by state, sorts by absolute score, renders expandable rows (`aria-expanded`) with history, and shows wrestler notes in a separate block. Includes an inline `StateBadge`.
- `components/universe/WrestlerPicker.jsx` — native `<select>` labelled "Wrestler", listing wrestlers sorted by name.
- `components/universe/RelationshipProfile.test.jsx` — tests for grouping, sorting, expand, empty state, rename, former counterpart and notes block.
- `App.jsx` — temporary PROFILES page mounting the picker and profile. Selection falls back to the first wrestler by name.
- `index.css` — `.badge`, `.badge-ally`, `.badge-neutral`, `.badge-rival`, `.badge-enemy` and profile layout classes.

## How it works
- **AC 1 Profile:** Selecting a wrestler shows sections Allies, Rivals, Enemies and Neutral, in that order. Each row shows counterpart name, score and state badge. Rows are sorted by |score| descending. Empty sections are hidden. Neutral appears only for relationships that have history (score may be 0 after deltas cancel out).
- **AC 2 Explanation:** Expanding a row shows its history oldest first, with week, signed delta, reason and the linked event/match label when present.
- **AC 3 Empty:** A wrestler with no relationships shows "No history yet". An empty roster shows "No wrestlers yet".
- **AC 4 Rename:** Profiles show current names. Removed counterparts show their last name with "(former)".
- **AC 5 Persistence:** Content is derived only from the stored universe and is identical after reload.
- **AC 6 Notes:** Wrestler `notes` appear only in the "Notes" block.
- **AC 7 Read-only:** The only controls are the row expanders and the picker. No control edits scores or history.

## How to test
Automated: `npm run lint --silent`, `npm run test --silent`, `npm run build --silent`.

Manual (`npm run dev`, open PROFILES):
- AC 1 **Verify:** pick a wrestler with relationships; sections Allies/Rivals/Enemies/Neutral appear in order, rows sorted by |score|, empty sections hidden.
- AC 2 **Verify:** click a row; `aria-expanded` becomes true and history shows week, signed delta, reason and "Event …"/"Match …" label, oldest first.
- AC 3 **Verify:** a wrestler with no relationships shows "No history yet"; empty roster shows "No wrestlers yet".
- AC 4 **Verify:** remove a wrestler who has relationships; other profiles show "NAME (former)".
- AC 5 **Verify:** reload the page; profile content is unchanged.
- AC 6 **Verify:** wrestler notes appear only in the "Notes" block.
- AC 7 **Verify:** the only buttons on the profile are the row expanders; no inputs.

## Deployment notes
- No data migration. No new dependencies.
- `dist/` build artifacts are included in the branch diff. Confirm with the team whether committing `dist/` is intended.
- No pre- or post-deployment manual steps.

## Known limitations
- The PROFILES page is a temporary top-level navigation entry. It must move into the UNIVERSE shell tab once that shell is merged, and the temporary entry must then be removed (PO-approved follow-up).
- Event labels are plain text ("Event {id}"); there is no navigation to the timeline yet.
- Graph visualisation and manual score editing are out of scope.
- CSS: the stylesheet has no CSS variables, so badge colours reuse the hex values of the existing status classes (PO-approved).
