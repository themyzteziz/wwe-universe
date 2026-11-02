# US-128: Relationships evolve naturally based on match results
**Status:** Release Ready · **Type:** story · **Category:** development · **Points:** 5 · **Sprint:** 3

## Summary
As an agent, I want relationships to evolve naturally based on match results, previous events, and interactions, so that the work gets done faster and with fewer mistakes.

## What was built
- `src/bookings/relationships-evolve-naturally.service.ts`
- `test/bookings/relationships-evolve-naturally.test.ts`

## How it works
- AC 1: Relationships evolve naturally based on match
- AC 2: Invalid input is rejected

## How to test
## Tests
- [ ] Run the project's checks (`run_checks`)

## Manual Testing
- [ ] **AC 1: Relationships evolve naturally based on match**
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
