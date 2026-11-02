# US-125: These can be explored later, but never block the first working simulation
**Status:** Release Ready · **Type:** story · **Category:** development · **Points:** 5 · **Sprint:** 3

## Summary
As an agent, I want these can be explored later, but to never block the first working simulation, so that the work gets done faster and with fewer mistakes.

## What was built
- `src/bookings/these-can-be.service.ts`
- `test/bookings/these-can-be.test.ts`

## How it works
- AC 1: These can be explored later
- AC 2: Negative path
- AC 3: Invalid input is rejected

## How to test
## Tests
- [ ] Run the project's checks (`run_checks`)

## Manual Testing
- [ ] **AC 1: These can be explored later**
  Follow the AC with a test booking.
  **Verify:** the outcome described in the AC.
- [ ] **AC 2: Negative path**
  Follow the AC with a test booking.
  **Verify:** the outcome described in the AC.
- [ ] **AC 3: Invalid input is rejected**
  Follow the AC with a test booking.
  **Verify:** the outcome described in the AC.

## Deployment notes
No manual steps.

## Test evidence
Peer-tested by QA — see **test_report.md** in this story's folder (version 1, with screenshots per acceptance criterion).

## Known limitations
- None identified.
