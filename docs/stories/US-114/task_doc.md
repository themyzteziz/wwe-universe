# US-114: Stable wrestler IDs are independent of wrestler names to support renames
**Status:** Release Ready · **Type:** story · **Category:** development · **Points:** 5 · **Sprint:** 2

## Summary
As an agent, I want stable wrestler IDs to be independent of wrestler names to support renames and reliable relationship links, so that the work gets done faster and with fewer mistakes.

## What was built
- `src/bookings/stable-wrestler-ids.service.ts`
- `test/bookings/stable-wrestler-ids.test.ts`

## How it works
- AC 1: Stable wrestler IDs are independent of wrestler
- AC 2: Invalid input is rejected

## How to test
## Tests
- [ ] Run the project's checks (`run_checks`)

## Manual Testing
- [ ] **AC 1: Stable wrestler IDs are independent of wrestler**
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
