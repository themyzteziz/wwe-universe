# US-118: Avoid embedding API secrets in browser bundles or localStorage
**Status:** Release Ready · **Type:** story · **Category:** development · **Points:** 5 · **Sprint:** 2

## Summary
As an agent, I want avoid embedding API secrets in browser bundles or localStorage. If hosted AI calls are required, propose a separate secure backend, so that the work gets done faster and with fewer mistakes.

## What was built
- `src/bookings/avoid-embedding-api.service.ts`
- `test/bookings/avoid-embedding-api.test.ts`

## How it works
- AC 1: Avoid embedding API secrets in browser bundles
- AC 2: Invalid input is rejected

## How to test
## Tests
- [ ] Run the project's checks (`run_checks`)

## Manual Testing
- [ ] **AC 1: Avoid embedding API secrets in browser bundles**
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
