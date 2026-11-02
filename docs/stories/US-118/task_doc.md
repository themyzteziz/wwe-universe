# US-118: Relationship model: scale, states and explainable history
**Status:** Ready for UAT · **Category:** development · **Points:** 5 · **Sprint:** not recorded

## Summary
Wrestlers now have directed relationships with an integer score from −100 to 100, a readable state (enemy, rival, neutral, ally) and a history of every change with its reason. The feature is internal logic only; no screen shows it yet. Relationships survive removal of a wrestler and save/load.

## What was built
- `universe/relationships.js` (new, pure, no React): `applyDelta` (clamped score change, optional mutual change, history entry), `getRelationship`, `listFor` (outgoing relationships, including former counterparts), `nameOf` (name plus `former` flag), `RelationshipError`; re-exports `stateOf`.
- `universe/constants.js`: score limits, state thresholds and `stateOf(score)`.
- `universe/schema.js`: `validateUniverse` relationship rules (score range and integer, no self-pair, state matches score, unique ordered pair).
- `universe/UniverseContext.jsx`: reducer action `applyRelationshipDelta`; invalid input leaves state unchanged.
- `universe/relationships.test.js` (new): tests per acceptance criterion.
- `universe/schema.test.js`: fixture corrected (score 10 now has state `neutral`).

## How it works
- **AC 1 Apply delta:** `applyDelta` returns a new universe. The A→B score becomes clamp(old + delta, −100, 100), a missing relationship starts at 0, `state` is recomputed and one history entry is appended with `scoreAfter` = new score. The input is not mutated.
- **AC 2 State mapping:** `stateOf`: ≤ −60 enemy; −59 to −20 rival; −19 to 19 neutral; ≥ 20 ally.
- **AC 3 Direction:** `mutual: false` changes only A→B. `mutual: true` changes A→B and B→A by the same delta, each with its own history entry.
- **AC 4 Invalid input:** self-pair, unknown wrestler id, non-integer or non-finite delta, empty reason or non-integer week throw `RelationshipError` with a plain message; the input is unchanged. Delta 0 is accepted but adds no history and creates no relationship.
- **AC 5 Removed wrestler:** after `removeWrestler`, the wrestler stays in `formerWrestlers`; relationships stay in place; `listFor` still returns them; `nameOf` returns `former: true`. `applyDelta` rejects any delta involving a former wrestler.
- **AC 6 Persistence and validation:** relationships survive a JSON save/load round trip. `validateUniverse` rejects scores outside −100..100, self-pairs, states that disagree with the score, and duplicate ordered pairs.

## How to test
Run `npm run check` (lint, test, build).
Unit tests: `npx vitest run universe/relationships.test.js universe/schema.test.js`.

- AC 1: **Verify:** "AC 1: apply delta" tests pass: score, state, one history entry with `scoreAfter`, input frozen and unchanged.
- AC 2: **Verify:** "AC 2: state mapping" table covers −100…100 boundaries.
- AC 3: **Verify:** "AC 3: direction" tests pass: non-mutual creates only A→B; mutual writes both with separate history.
- AC 4: **Verify:** "AC 4: invalid" tests pass: each bad input throws `RelationshipError`; delta 0 adds nothing.
- AC 5: **Verify:** "AC 5: removed wrestler" tests pass: relationships, `listFor` and `nameOf` (`former: true`) still work; `applyDelta` rejects former wrestlers.
- AC 6: **Verify:** "AC 6: persistence and validation" tests pass: JSON round trip; `validateUniverse` rejects bad score, self-pair, wrong state and duplicate pair.

## Deployment notes
- No manual steps. No data migration; the schema version is not changed.
- Relationships are stored in the universe; existing universes without relationships load unchanged.
- The committed `dist/` files are build output from this branch.

## Known limitations
- No UI: relationships cannot be viewed or changed by users yet (profiles are a later story).
- No decay over time (out of scope for v1).
- History ids are generated with `newId('h')` and are not deterministic; tests do not depend on them.
