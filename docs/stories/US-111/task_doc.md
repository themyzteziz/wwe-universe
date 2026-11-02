# US-111: Events are influenced by wrestler history
**Status:** Release Ready · **Type:** story · **Category:** development · **Points:** 5 · **Sprint:** 2

## Summary
As an agent, I want events to be influenced by wrestler history, current relationships, recent results, existing feuds and narrative context, so that the work gets done faster and with fewer mistakes.

## What was built
- `src/bookings/events-influenced-wrestler.service.ts`
- `test/bookings/events-influenced-wrestler.test.ts`

## How it works
- AC 1: Events are influenced by wrestler history
- AC 2: Invalid input is rejected

## How to test
## Tests
- [ ] Run the project's checks (`run_checks`)

## Manual Testing
- [ ] **AC 1: Events are influenced by wrestler history**
  Follow the AC with a test booking.
  **Verify:** the outcome described in the AC.
- [ ] **AC 2: Invalid input is rejected**
  Follow the AC with a test booking.
  **Verify:** the outcome described in the AC.

## Deployment notes
No manual steps.

## Test evidence
Peer-tested by QA — see **test_report.md** in this story's folder (version 1, with screenshots per acceptance criterion).

## Known limitations
- None identified.
