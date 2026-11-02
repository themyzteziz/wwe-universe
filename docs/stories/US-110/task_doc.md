# US-110: Many matches produce no event
**Status:** Release Ready · **Type:** story · **Category:** configuration · **Points:** 3 · **Sprint:** 1

## Summary
As an agent, I want many matches to produce no event. Use configurable probabilities and rarity tiers, with cooldowns and anti-repetition rules, so that the process runs with fewer manual steps.

## What was built
- `src/config/many-matches-produce.ts`
- `test/config/many-matches-produce.test.ts`

## How it works
- AC 1: Many matches produce no event
- AC 2: Invalid input is rejected

## How to test
## Tests
- [ ] Run the project's checks (`run_checks`)

## Manual Testing
- [ ] **AC 1: Many matches produce no event**
  Follow the AC with a test booking.
  **Verify:** the outcome described in the AC.
- [ ] **AC 2: Invalid input is rejected**
  Follow the AC with a test booking.
  **Verify:** the outcome described in the AC.

## Deployment notes
## Configuration
- [ ] Set `MANY_MATCHES_PRODUCE_ENABLED` in each environment (default `true`).

## Test evidence
Peer-tested by QA — see **test_report.md** in this story's folder (version 1, with screenshots per acceptance criterion).

## Known limitations
- None identified.
