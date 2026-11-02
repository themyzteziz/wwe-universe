import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createRng, deriveSeed, defaultSeed } from './rng.js';

const take = (r, n) => Array.from({ length: n }, () => r.next());

describe('AC 1: determinism', () => {
  it('same seed gives the same first 100 values; different seed differs', () => {
    const va = take(createRng(42), 100);
    expect(take(createRng(42), 100)).toEqual(va);
    expect(take(createRng(43), 100)).not.toEqual(va);
  });

  it('normalises the seed to uint32 and keeps RNGs independent', () => {
    expect(createRng(-1).seed).toBe(4294967295);
    const first = createRng(7).next();
    createRng(7).next();
    expect(createRng(7).next()).toBe(first);
  });

  it('rejects non-number or non-finite seeds', () => {
    expect(() => createRng('42')).toThrow(TypeError);
    expect(() => createRng(NaN)).toThrow(TypeError);
    expect(() => createRng(Infinity)).toThrow(TypeError);
    expect(() => createRng(null)).toThrow(TypeError);
  });
});

describe('AC 2: range', () => {
  it('next() stays in [0,1)', () => {
    for (const v of take(createRng(1), 10000)) expect(v >= 0 && v < 1).toBe(true);
  });

  it('int(a,b) is inclusive on both bounds and nothing else', () => {
    const r = createRng(5);
    const seen = new Set();
    for (let i = 0; i < 1000; i += 1) seen.add(r.int(3, 5));
    expect([...seen].sort()).toEqual([3, 4, 5]);
    expect(r.int(2, 2)).toBe(2);
  });

  it('int throws RangeError for a>b or non-integers', () => {
    const r = createRng(5);
    expect(() => r.int(5, 3)).toThrow(RangeError);
    expect(() => r.int(1.5, 3)).toThrow(RangeError);
    expect(() => r.int(1, 2.5)).toThrow(RangeError);
  });

  it('pick returns members and throws on empty', () => {
    const r = createRng(9);
    for (let i = 0; i < 50; i += 1) expect(['a', 'b', 'c']).toContain(r.pick(['a', 'b', 'c']));
    expect(() => r.pick([])).toThrow(RangeError);
  });

  it('weightedPick never returns zero-weight items and follows weights', () => {
    const r = createRng(11);
    const counts = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 2000; i += 1) counts[r.weightedPick(['a', 'b', 'c'], [0, 1, 3])] += 1;
    expect(counts.a).toBe(0);
    expect(counts.c).toBeGreaterThan(counts.b);
    expect(createRng(1).weightedPick(['x', 'y'], [0, 5])).toBe('y');
    expect(createRng(1).weightedPick(['x', 'y'], [5, 0])).toBe('x');
  });

  it('weightedPick rejects invalid weights', () => {
    const r = createRng(11);
    expect(() => r.weightedPick(['a'], [-1])).toThrow(RangeError);
    expect(() => r.weightedPick(['a'], [NaN])).toThrow(RangeError);
    expect(() => r.weightedPick(['a'], [Infinity])).toThrow(RangeError);
    expect(() => r.weightedPick(['a', 'b'], [0, 0])).toThrow(RangeError);
    expect(() => r.weightedPick(['a', 'b'], [1])).toThrow(RangeError);
  });
});

describe('AC 3: derive', () => {
  it('is deterministic', () => {
    expect(deriveSeed(42, 1)).toBe(deriveSeed(42, 1));
  });

  it('differs for n=0..999 and returns uint32', () => {
    const seen = new Set();
    for (let n = 0; n < 1000; n += 1) {
      const s = deriveSeed(42, n);
      expect(Number.isInteger(s) && s >= 0 && s <= 4294967295).toBe(true);
      seen.add(s);
    }
    expect(seen.size).toBe(1000);
  });
});

describe('AC 4: default seed', () => {
  it('uses a stored integer seed and differs between successive RNGs', () => {
    const a = createRng();
    const b = createRng();
    expect(Number.isInteger(a.seed)).toBe(true);
    expect(a.seed).not.toBe(b.seed);
    expect(createRng(a.seed).next()).toBe(a.next());
    expect(defaultSeed()).not.toBe(defaultSeed());
  });
});

describe('engine rule: no unseeded randomness', () => {
  it('no non-test universe/sim/*.js file calls Math.random', () => {
    const dir = fileURLToPath(new URL('./', import.meta.url));
    const files = readdirSync(dir).filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'));
    expect(files).toContain('rng.js');
    for (const f of files) expect(readFileSync(join(dir, f), 'utf8')).not.toContain('Math.random');
  });
});
