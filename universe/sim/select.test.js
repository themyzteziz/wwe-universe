import { describe, expect, it, vi } from 'vitest';
import { createRng } from './rng.js';
import { getEligibleCandidates } from './eligibility.js';
import { computeWeights, selectEvent } from './select.js';
import { applyDelta } from '../relationships.js';

// Eligibility is covered by US-124; here it only supplies a fixed candidate list.
vi.mock('./eligibility.js', () => ({ getEligibleCandidates: vi.fn() }));

const wrestlers = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, name: id.toUpperCase() }));
const base = (over = {}) => ({
  week: 6,
  wrestlers,
  matchResults: [],
  events: [],
  relationships: [],
  factions: [],
  storylines: [],
  ...over,
});
const settings = (over = {}) => ({ eventFrequency: 100, chaos: 0, historySensitivity: 100, ...over });
const cand = (type, ...participantIds) => ({ type, participantIds });
const match = { id: 'm1', week: 6, participantIds: ['a', 'b'], winnerIds: ['a'] };
const seeds = (n) => Array.from({ length: n }, (_, i) => i + 1);
const run = (state, cfg, seed, options) => selectEvent(state, match, cfg, createRng(seed), options);
const withCandidates = (list) => getEligibleCandidates.mockReturnValue(list);
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

describe('AC 1: no-event path', () => {
  it('frequency 0 never proposes; frequency 100 with candidates always does', () => {
    withCandidates([cand('confrontation', 'a', 'b')]);
    for (const seed of seeds(1000)) {
      expect(run(base(), settings({ eventFrequency: 0 }), seed)).toBeNull();
      expect(run(base(), settings({ eventFrequency: 100 }), seed)).not.toBeNull();
    }
  });

  it('returns null without candidates, even when forced, and clamps out-of-range frequency', () => {
    withCandidates([]);
    expect(run(base(), settings(), 1, { force: true })).toBeNull();
    withCandidates([cand('confrontation', 'a', 'b')]);
    expect(run(base(), settings({ eventFrequency: 500 }), 1)).not.toBeNull();
    expect(run(base(), settings({ eventFrequency: -5 }), 1)).toBeNull();
  });

  it('force ignores a failed roll; the roll always consumes exactly one next()', () => {
    const fresh = () => createRng(3);
    const second = (() => {
      const r = fresh();
      r.next();
      return r.next();
    })();
    const third = (() => {
      const r = fresh();
      r.next();
      r.next();
      return r.next();
    })();

    withCandidates([cand('confrontation', 'a', 'b')]);
    const forced = fresh();
    expect(selectEvent(base(), match, settings({ eventFrequency: 0 }), forced, { force: true })).not.toBeNull();
    expect(forced.next()).toBe(third); // roll + weightedPick consumed

    const failed = fresh();
    expect(selectEvent(base(), match, settings({ eventFrequency: 0 }), failed)).toBeNull();
    expect(failed.next()).toBe(second); // roll only

    withCandidates([]);
    const none = fresh();
    expect(selectEvent(base(), match, settings(), none, { force: true })).toBeNull();
    expect(none.next()).toBe(second); // roll only, even with no candidates
  });
});

describe('AC 2: reproducible', () => {
  it('same state, settings and seed give the same result', () => {
    withCandidates([cand('confrontation', 'a', 'b'), cand('ambush', 'c', 'd'), cand('betrayal', 'a', 'c')]);
    const cfg = settings({ chaos: 50, eventFrequency: 60 });
    for (const seed of [1, 7, 99, 12345]) {
      expect(run(base(), cfg, seed)).toEqual(run(base(), cfg, seed));
    }
  });
});

describe('AC 3: distribution', () => {
  it('proposes about 25% of the time over 10,000 seeds (25% +/- 2 points)', () => {
    withCandidates([cand('confrontation', 'a', 'b'), cand('ambush', 'c', 'd')]);
    const cfg = settings({ eventFrequency: 25 });
    const proposed = seeds(10000).filter((seed) => run(base(), cfg, seed) !== null).length;
    expect(proposed).toBeGreaterThanOrEqual(2300);
    expect(proposed).toBeLessThanOrEqual(2700);
  });
});

describe('AC 4: history bias', () => {
  const pairA = cand('confrontation', 'a', 'b');
  const pairB = cand('confrontation', 'c', 'd');
  const state = base({ storylines: [{ id: 's1', title: 'Feud', participantIds: ['a', 'b'], eventIds: [], status: 'open' }] });

  it('picks the pair with an open storyline more often than the pair without', () => {
    withCandidates([pairA, pairB]);
    const picks = seeds(2000).map((seed) => run(state, settings(), seed, { force: true }));
    const countA = picks.filter((p) => p === pairA).length;
    const countB = picks.filter((p) => p === pairB).length;
    expect(countA + countB).toBe(2000);
    expect(countA).toBeGreaterThan(countB);
  });

  it('weights: open storyline triples the odds at sensitivity 100 and is ignored at 0', () => {
    const [pa, pb] = computeWeights(state, [pairA, pairB], settings());
    expect(pa).toBeCloseTo(0.75, 9);
    expect(pb).toBeCloseTo(0.25, 9);
    const [qa, qb] = computeWeights(state, [pairA, pairB], settings({ historySensitivity: 0 }));
    expect(qa).toBeCloseTo(0.5, 9);
    expect(qb).toBeCloseTo(0.5, 9);
  });

  it('counts closed storylines as nothing, recent accepted events as 1 and old ones as 0', () => {
    const closed = base({ storylines: [{ id: 's1', participantIds: ['a', 'b'], status: 'closed' }] });
    expect(computeWeights(closed, [pairA, pairB], settings())[0]).toBeCloseTo(0.5, 9);
    const event = (week, state = 'accepted') => ({ id: 'e1', type: 'ambush', week, participantIds: ['a', 'b'], state });
    expect(computeWeights(base({ events: [event(2)] }), [pairA, pairB], settings())[0]).toBeCloseTo(2 / 3, 9);
    expect(computeWeights(base({ events: [event(1)] }), [pairA, pairB], settings())[0]).toBeCloseTo(0.5, 9);
    expect(computeWeights(base({ events: [event(5, 'rejected')] }), [pairA, pairB], settings())[0]).toBeCloseTo(0.5, 9);
  });

  it('relationship intensity (averaged over ordered pairs) raises the odds', () => {
    const rel = { fromId: 'a', toId: 'b', score: -80, state: 'enemy', history: [] };
    const [pa] = computeWeights(base({ relationships: [rel] }), [pairA, pairB], settings());
    // intensity = (0.8 + 0) / 2 = 0.4
    expect(pa).toBeCloseTo(1.4 / 2.4, 9);
  });
});

describe('AC 5: chaos', () => {
  it('raises the share of rare types compared with chaos 0', () => {
    const list = [cand('confrontation', 'a', 'b'), cand('ambush', 'c', 'd'), cand('betrayal', 'a', 'c')];
    withCandidates(list);
    const rareShare = (chaos) =>
      seeds(2000).filter((seed) => run(base(), settings({ chaos }), seed, { force: true }).type === 'betrayal').length;
    expect(rareShare(100)).toBeGreaterThan(rareShare(0));
    computeWeights(base(), list, settings({ chaos: 100 })).forEach((p) => expect(p).toBeCloseTo(1 / 3, 9));
  });
});

describe('AC 6: continuity', () => {
  it('weights for a pair change after an ambush is accepted', () => {
    const confrontation = cand('confrontation', 'a', 'b');
    const other = cand('confrontation', 'c', 'd');
    const before = base();
    const after = applyDelta(
      base({
        storylines: [{ id: 's1', title: 'Ambush feud', participantIds: ['a', 'b'], eventIds: ['e1'], status: 'open' }],
        events: [{ id: 'e1', type: 'ambush', week: 6, participantIds: ['a', 'b'], state: 'accepted' }],
      }),
      { fromId: 'b', toId: 'a', delta: -30, source: { eventId: 'e1', week: 6, reason: 'Ambushed' } },
    );
    const wBefore = computeWeights(before, [confrontation, other], settings());
    const wAfter = computeWeights(after, [confrontation, other], settings());
    expect(wAfter[0]).not.toBeCloseTo(wBefore[0], 6);
    expect(wAfter[0]).toBeGreaterThan(wBefore[0]);
  });
});

describe('computeWeights', () => {
  it('returns non-negative probabilities that sum to 1, and [] without candidates', () => {
    const list = [cand('confrontation', 'a', 'b'), cand('save', 'c', 'd', 'e'), cand('return', 'a', 'b', 'c', 'd')];
    const state = base({ relationships: [{ fromId: 'a', toId: 'b', score: 100, state: 'ally', history: [] }] });
    for (const chaos of [0, 33, 100]) {
      for (const historySensitivity of [0, 50, 100]) {
        const ps = computeWeights(state, list, settings({ chaos, historySensitivity }));
        expect(ps).toHaveLength(3);
        expect(ps.every((p) => p >= 0)).toBe(true);
        expect(Math.abs(sum(ps) - 1)).toBeLessThan(1e-9);
      }
    }
    expect(computeWeights(state, [], settings())).toEqual([]);
  });
});
