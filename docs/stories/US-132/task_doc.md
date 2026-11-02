# US-132: Universe timeline view
**Status:** Ready for UAT · **Category:** development · **Points:** 3 · **Sprint:** —

## Summary
The UNIVERSE view now has a Timeline sub-tab that lists match results and simulation events in chronological order. Players can reverse the order, filter by week range, wrestler, event type and state, and optionally show rejected events (dimmed and labelled "Rejected"). The timeline is read-only and is rebuilt from the saved universe, so it is the same after a reload.

## What was built
- `universe/selectors.js` — `timelineEntries(state, filters)`: pure function that builds, filters and sorts match and event entries.
- `components/universe/Timeline.jsx` — filter bar (week from/to, wrestler, event type, "Show rejected", order toggle), list and pager (50 per page).
- `components/universe/UniverseView.jsx` — the Timeline sub-tab renders `Timeline`.
- `index.css` — timeline styles; dimmed entries use reduced opacity plus a text label.
- `universe/selectors.test.js`, `components/universe/Timeline.test.jsx` — tests for every AC.

## How it works
- **AC 1 (Order):** Entries are sorted by week, then creation time, then id. Default is newest first; the order button switches to oldest first.
- **AC 2 (Filters):** Choosing a wrestler keeps only entries whose participants include that wrestler. Event type applies to events only, so match entries are hidden when an event type is selected.
- **AC 3 (Rejected):** Rejected events are hidden by default. Ticking "Show rejected" displays them dimmed with a "Rejected" label.
- **AC 4 (Empty):** With no entries, the list shows "Nothing has happened yet". If filters remove all entries, it shows "No entries match these filters".
- **AC 5 (Persistence):** The timeline is derived from the saved universe data, so it is identical after a refresh.
- **AC 6 (Scale):** The list shows 50 entries per page with Prev/Next. Any filter change returns the view to page 1. The selector result is memoised with `useMemo`.
- **Week range:** An invalid range (non-number, or from greater than to) shows an inline message and does not filter.

## How to test
Run `npm run lint --silent && npm run test --silent && npm run build --silent`.

Manual checks (`npm run dev`, UNIVERSE > Timeline):
- AC 1 — With several results, the newest week is on top. The order button switches to oldest first.
- AC 2 — Choose a wrestler; only entries naming them remain.
- AC 3 — Rejected events are hidden. Tick "Show rejected": they appear dimmed with a "Rejected" label.
- AC 4 — With a fresh universe, "Nothing has happened yet" is shown.
- AC 5 — Reload the page; the timeline is identical.
- AC 6 — With 500 entries only 50 rows show; Next reaches page 2; changing a filter returns to page 1.

## Deployment notes
- No migration, configuration or manual step is required.
- `dist/index.html` changed only because of the build. Do not commit build artefacts unless the release process requires them.

## Known limitations
- The state filter in the selector supports `rejected`, but the UI has no control for it; the "Show rejected" checkbox is the only way to reveal rejected events.
- Layout and opacity styling were verified by static review only; visual check in a browser is still recommended.
- Timeline is read-only: no editing or deleting of events (out of scope).
