# US-122: Seedable random number generator
**Status:** Ready for UAT · **Category:** development · **Points:** 2 · **Sprint:** —

## Summary
The simulation engine now has an injectable, seeded random number generator. Same seed gives the same sequence, so simulation tests and bug reports can be reproduced. The engine never calls `Math.random` directly.

## What was built
- `universe/sim/rng.js` — `createRng(seed?)` returns `{seed, next, int, pick, weightedPick}`; `deriveSeed(seed, n)` derives reproducible sub-seeds (reroll = `deriveSeed(prevSeed, attempt)`); `defaultSeed()` produces a time-based seed without `Math.random`.
- `universe/sim/rng.test.js` — Vitest tests per AC, plus a scan that no non-test `universe/sim/*.js` file contains `Math.random`.
- `eslint.config.mjs` — replaced the broken `eslint-config-next` setup with the project's flat config (`@eslint/js`, `react-hooks`, `react-refresh`). Ignores only `dist`, `node_modules`, `src/**` and `test/**/*.ts`.
- Vitest installed and test scripts added (delivered via US-116 on the branch).

## How it works
- **AC 1 Determinism:** two RNGs created with the same seed produce identical sequences of `next()` values.
- **AC 2 Range:** `next()` returns values in [0,1). `int(a,b)` returns integers in [a,b] inclusive; `a>b` or non-integer bounds throw `RangeError`.
- **AC 3 Derive:** `deriveSeed(seed, n)` is deterministic and gives different results for different `n` (checked for n = 0..999 with seed 42).
- **AC 4 Default:** `createRng()` without a seed uses `defaultSeed()`. The chosen seed is exposed as `rng.seed`, so callers can store it and replay the stream with `createRng(rng.seed)`.

Seed normalisation: the seed is converted with `>>> 0` (uint32). A non-finite or non-number seed throws `TypeError`.

## How to test
- Checks: `npm run lint --silent`, `npm run test --silent`, `npm run build --silent`
- Unit tests: `npx vitest run universe/sim/rng.test.js`
- AC 1 **Verify:** `createRng(42)` twice yields equal first 100 values; seed 43 differs.
- AC 2 **Verify:** `next()` stays in [0,1) over 10k calls; `int(3,5)` yields exactly {3,4,5}; `int(2,2)` equals 2; `int(5,3)` throws `RangeError`.
- AC 3 **Verify:** `deriveSeed(42,1)` is repeatable; n = 0..999 gives 1000 distinct values.
- AC 4 **Verify:** `createRng().seed` is an integer; two successive default RNGs differ; `createRng(rng.seed)` replays the stream.

## Deployment notes
- No manual steps. No migrations or configuration.
- Dependency change: Vitest is a dev dependency; `package-lock.json` must be committed with it so `npm ci` works in CI.

## Known limitations
- Not cryptographic randomness (out of scope).
- The `src/` and `test/` TypeScript scaffold files are excluded from lint and are candidates for removal in a later cleanup.
