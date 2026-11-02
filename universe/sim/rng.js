// Seedable, injectable randomness for the simulation engine (mulberry32).
// Engine code must take an rng from here and never use the platform's unseeded generator.

const GOLDEN = 0x9e3779b1;
let counter = 0;

/** Time-based seed (uint32); two calls in the same millisecond still differ. */
export function defaultSeed() {
  counter += 1;
  return ((Date.now() >>> 0) ^ Math.imul(counter, GOLDEN)) >>> 0;
}

/**
 * Deterministic uint32 seed derived from a seed and a counter.
 * Reroll = deriveSeed(prevSeed, attempt) with attempt starting at 1; n=0 is reserved for descriptions.
 */
export function deriveSeed(seed, n) {
  let x = ((seed >>> 0) ^ Math.imul(n + 1, GOLDEN)) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0;
}

/**
 * @param {number} [seed] uint32-normalised; omitted → defaultSeed(). Exposed as `rng.seed`.
 * @returns {{seed: number, next: () => number, int: (a: number, b: number) => number,
 *   pick: <T>(arr: T[]) => T, weightedPick: <T>(items: T[], weights: number[]) => T}}
 */
export function createRng(seed) {
  if (seed !== undefined && (typeof seed !== 'number' || !Number.isFinite(seed))) {
    throw new TypeError('seed must be a finite number');
  }
  const start = seed === undefined ? defaultSeed() : seed >>> 0;
  let state = start;

  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function int(a, b) {
    if (!Number.isInteger(a) || !Number.isInteger(b)) throw new RangeError('int bounds must be integers');
    if (a > b) throw new RangeError('int lower bound must not exceed upper bound');
    return a + Math.floor(next() * (b - a + 1));
  }

  function pick(arr) {
    if (!Array.isArray(arr) || arr.length === 0) throw new RangeError('pick needs a non-empty array');
    return arr[Math.floor(next() * arr.length)];
  }

  function weightedPick(items, weights) {
    if (!Array.isArray(items) || !Array.isArray(weights) || items.length !== weights.length) {
      throw new RangeError('items and weights must be arrays of the same length');
    }
    let total = 0;
    for (const w of weights) {
      if (typeof w !== 'number' || !Number.isFinite(w) || w < 0) {
        throw new RangeError('weights must be finite numbers >= 0');
      }
      total += w;
    }
    if (!(total > 0)) throw new RangeError('weights must sum to more than 0');
    const r = next() * total;
    let acc = 0;
    let lastPositive = -1;
    for (let i = 0; i < items.length; i += 1) {
      if (weights[i] === 0) continue;
      lastPositive = i;
      acc += weights[i];
      if (r < acc) return items[i];
    }
    return items[lastPositive]; // floating-point rounding guard
  }

  return { seed: start, next, int, pick, weightedPick };
}
