# US-117: Keep the app functional without paid AI APIs
**Status:** Release Ready · **Type:** story · **Category:** development · **Points:** 5 · **Sprint:** 2

## Summary
As an agent, I want keep the app functional without paid AI APIs; AI text generation to be optional, with clear handling of missing keys and costs, so that the work gets done faster and with fewer mistakes.

## What was built
- `src/bookings/keep-app-functional.service.ts`
- `test/bookings/keep-app-functional.test.ts`

## How it works
- AC 1: Keep the app functional without paid AI APIs
- AC 2: Invalid input is rejected

## How to test
## Tests
- [ ] Run the project's checks (`run_checks`)

## Manual Testing
- [ ] **AC 1: Keep the app functional without paid AI APIs**
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
