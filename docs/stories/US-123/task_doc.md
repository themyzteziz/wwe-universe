# US-123: Event type catalogue, rarity tiers and default probabilities
**Status:** Ready for UAT · **Category:** configuration · **Points:** 3 · **Sprint:** not recorded

## Summary
The simulation now has a fixed vocabulary of eight event types, each with a rarity tier, participant limits, cooldowns and a relationship rule. Tier weights and all tunable values live in one config module, so rules never hard-code them. No player-facing change in this story; the catalogue is consumed by later stories (US-124, US-125, US-126).

## What was built
- `universe/sim/config.js`: exports `TIERS` (common 70, uncommon 25, rare 5), `EVENT_TYPES` (8 types keyed by id), `HISTORY_WINDOW_WEEKS` (4), `SUGGESTION_MIN_STORYLINE_EVENTS` (2), `CHAOS_DELTA_JITTER` and `validateConfig`. It imports `EVENT_TYPE_NAMES` from `universe/constants.js` (US-113) to check that the catalogue is complete.
- `universe/sim/config.test.js`: vitest suite, one group per acceptance criterion.
- `eslint.config.mjs`: replaced the config that imported the uninstalled `eslint-config-next` with a flat config (`@eslint/js` recommended, `dist/` ignored).

## How it works
- **AC 1 Catalogue:** `EVENT_TYPES` has the eight keys `confrontation`, `respect`, `interference`, `save`, `ambush`, `betrayal`, `faction`, `return`. Each entry carries `tier`, `minParticipants`, `maxParticipants`, `cooldownWeeks`, `pairCooldownWeeks`, `roles`, `relationRule` and `deltas` (see note below). Tiers: common = confrontation, respect; uncommon = interference, save, ambush; rare = betrayal, faction, return.
- **AC 2 Defaults from one place:** `DEFAULT_SETTINGS` is owned only by `universe/constants.js`. `sim/config.js` does not export it. The test checks the exact values `{eventFrequency:25, chaos:50, historySensitivity:50, autoPropose:true, seed:null, aiEnabled:false, aiEndpoint:""}` and that `sim/config.js` has no such export.
- **AC 3 Validation:** `validateConfig()` returns an empty array for the shipped catalogue. It returns messages for a tier weight that is zero, negative or not finite, an unknown tier, `minParticipants` greater than `maxParticipants`, negative or non-integer cooldowns, a roles length that differs from `maxParticipants`, and catalogue keys that differ from `EVENT_TYPE_NAMES`.
- **AC 4 Return type:** only `return` has `requiresInactiveWrestler: true`.

## How to test
Run `npm run lint --silent`, `npm run test --silent` and `npm run build --silent`.

- **AC 1:** `Object.keys(EVENT_TYPES)` equals the 8 names in `EVENT_TYPE_NAMES`; `validateConfig()` returns `[]`; tiers, cooldowns and `relationRule` match the table in the story.
  - Verify: the test group "catalogue" passes.
- **AC 2:** `DEFAULT_SETTINGS` imported from `universe/constants.js` equals the exact values above; `'DEFAULT_SETTINGS'` is not a key of the `sim/config.js` exports.
  - Verify: the test group "defaults" passes against the real US-113 file.
- **AC 3:** set a tier weight to 0 or -1, or use tier `'epic'`; `validateConfig` returns errors. Also check min > max, negative cooldown, wrong roles length and a missing type.
  - Verify: the test group "validation" passes.
- **AC 4:** `EVENT_TYPES.return.requiresInactiveWrestler === true`; no other type has the flag.
  - Verify: the test group "return type" passes.

## Deployment notes
- No manual steps. US-113 (constants) and US-116 (vitest) are on the branch.
- No configuration to set. Values are defaults; tuning means editing `sim/config.js` and `constants.js`.
- No migrations and no data changes.

## Known limitations
- `relationRule` is a string id (`none`, `notEnemies`, `helperNotHostile`, `saviourAlly`, `hostileOrChaos`, `priorAlly`, `factionFormable`). The rule logic is not implemented here; it belongs to US-124. The field name differs from the acceptance criterion's `requiredRelationship`. This was approved by the product owner.
- `deltas` are not yet populated; they come with US-126.
- `return` is never generated in v1, because no wrestler has `status === 'inactive'`.
- No UI for editing the catalogue (out of scope).
