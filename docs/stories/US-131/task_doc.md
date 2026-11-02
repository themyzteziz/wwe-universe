# US-131: UNIVERSE view navigation shell
**Status:** Ready for UAT · **Category:** development · **Points:** 2 · **Sprint:** —

## Summary
Adds a separate UNIVERSE tab next to BOOKING and WRESTLERS, with four sub-tabs (Timeline, Relationships, Settings, Backup). A pending-proposal badge on the UNIVERSE tab shows how many event proposals await review. BOOKING and WRESTLERS are unchanged.

## What was built
- `components/universe/UniverseView.jsx`: sub-tab shell with local `subTab` state (default Timeline). Relationships, Settings and Backup show placeholders until US-132, US-133 and FT-107/US-134 deliver their panels.
- `components/universe/UniverseView.test.jsx`: RTL tests for AC 1–3.
- `App.jsx`: third top-level tab UNIVERSE with the pending badge (`aria-label="pending proposals"`), using the existing tab mechanism.
- `index.css`: nav wrapping (`.main-nav` flex-wrap), `.nav-badge`, `.universe-subtabs` (flex, wrap, gap) and `.universe-*` styles.

## How it works
- **AC 1 (Nav):** UNIVERSE tab opens the shell with four tabs (`role="tab"`) in a `role="tablist"`. Timeline is selected by default.
- **AC 2 (Existing views):** BOOKING and WRESTLERS code is untouched; existing App tests cover them.
- **AC 3 (Pending badge):** The badge counts `useUniverse().universe.events` with `state === 'proposed'`. It is hidden when the count is 0. The context exposes `universe`, not `state`; this was approved by the product owner.
- **AC 4 (Responsive):** CSS-only wrapping of the top nav and sub-tabs; no horizontal page overflow intended.
- The selected sub-tab is not persisted; it resets to Timeline on each visit.

## How to test
Run `npm run lint --silent && npm run test --silent && npm run build --silent`.

- AC 1: **Verify:** `npm run dev`, click UNIVERSE → sub-tabs Timeline, Relationships, Settings, Backup appear (Timeline selected).
- AC 2: **Verify:** BOOKING and WRESTLERS look and behave as before.
- AC 3: **Verify:** with a proposed event in storage, UNIVERSE shows a badge with the count; with none, no badge.
- AC 4: **Verify:** at 360px width the top tabs and sub-tabs wrap with no horizontal page scroll. **Not yet verified in a browser.**

## Deployment notes
### Pre-deploy steps
- None.

### Post-deploy steps
- Run `git rm -r --cached dist` and commit so the GitHub Pages workflow builds fresh assets from source. `dist/` is currently tracked and its committed bundle is stale.
- Manually verify AC 4 at 360px width in `npm run dev`.

## Known limitations
- Relationships, Timeline, Settings and Backup sub-tabs are placeholders until US-132, US-133 and FT-107/US-134 land. Replace them once integrated and verify each sub-tab.
- The top-level nav shows four tabs (BOOKING, WRESTLERS, PROFILES, UNIVERSE) because PROFILES (US-119) is still separate. Fold it into UNIVERSE during final integration.
- AC 4 (360px wrapping) is not verified in a browser; required before final release.
- Badge counts `universe.events` rather than `state.events` as written in the spec (approved by the product owner).
