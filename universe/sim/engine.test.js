import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rollEvent } from './engine.js';
import { createRng, deriveSeed } from './rng.js';
import { describeEvent } from './describe.js';
import { selectEvent } from './select.js';
import { buildProposal } from './consequences.js';

// Wiring tests only: select.js (US-125) and consequences.js (US-126) are mocked.
// TODO(US-126): replace these mocks with unmocked integration tests: same inputs => same
// event, frequency 0 with forced:false => { noEvent: true }, and equal deltas whatever the text.
vi.mock('./select.js', () => ({ selectEvent: vi.fn() }));
vi.mock('./consequences.js', () => ({ buildProposal: vi.fn() }));

const universe = {
  settings: { seed: null, eventFrequency: 25 },
  wrestlers: [
    { id: 'w1', name: 'Alpha' },
    { id: 'w2', name: 'Bravo' },
  ],
  matchResults: [],
  events: [],
  storylines: [],
};
const match = { id: 'm1', week: 3, seed: 1234 };
const candidate = { type: 'ambush', participantIds: ['w1', 'w2'] };

beforeEach(() => {
  vi.mocked(selectEvent).mockReset().mockReturnValue(candidate);
  vi.mocked(buildProposal).mockReset().mockImplementation((cand, _u, rng, meta) => ({
    ...cand,
    id: `e_${meta.seed}`,
    deltas: [{ fromId: 'w1', toId: 'w2', delta: -3 }],
    ...meta,
    draw: rng.next(),
  }));
});

describe('rollEvent', () => {
  it('derives the seed from the match seed, attempt and reroll count', () => {
    const { event } = rollEvent(universe, match, { attempt: 2, rerollCount: 1, now: 'T' });
    expect(event.seed).toBe(deriveSeed(deriveSeed(1234, 2), 1));
    expect(event).toMatchObject({ rerollCount: 1, matchId: 'm1', week: 3, now: 'T' });
  });

  it('prefers settings.seed over the match seed', () => {
    const u = { ...universe, settings: { ...universe.settings, seed: 99 } };
    expect(rollEvent(u, match).event.seed).toBe(deriveSeed(deriveSeed(99, 0), 0));
  });

  it('passes forced, excludeKey and the seeded rng stream through', () => {
    rollEvent(universe, match, { forced: true, excludeKey: 'ambush:w1:w2' });
    const [u, m, settings, rng, opts] = vi.mocked(selectEvent).mock.calls[0];
    expect(u).toBe(universe);
    expect(m).toBe(match);
    expect(settings).toBe(universe.settings);
    expect(opts).toEqual({ forced: true, excludeKey: 'ambush:w1:w2' });
    expect(rng.seed).toBe(deriveSeed(deriveSeed(1234, 0), 0));
    // buildProposal continues the same stream that selectEvent received
    expect(vi.mocked(buildProposal).mock.calls[0][2]).toBe(rng);
  });

  it('defaults to not forced, attempt 0 and reroll 0', () => {
    rollEvent(universe, match);
    expect(vi.mocked(selectEvent).mock.calls[0][4]).toEqual({ forced: false, excludeKey: undefined });
    expect(vi.mocked(selectEvent).mock.calls[0][3].seed).toBe(deriveSeed(deriveSeed(1234, 0), 0));
  });

  it('returns { noEvent: true } when nothing is selected and never builds a proposal', () => {
    vi.mocked(selectEvent).mockReturnValue(null);
    expect(rollEvent(universe, match)).toEqual({ noEvent: true });
    expect(buildProposal).not.toHaveBeenCalled();
  });

  it('sets the description from the deriveSeed(seed, 0) sub-stream', () => {
    const { event } = rollEvent(universe, match);
    const expected = describeEvent(candidate, universe, createRng(deriveSeed(event.seed, 0)));
    expect(event.description).toBe(expected);
    expect(event.description).toContain('Alpha');
    expect(event.description).toContain('Bravo');
  });

  it('same inputs give the same event, ignoring id and createdAt', () => {
    const strip = ({ event }) => {
      const { id, createdAt, ...rest } = event;
      void id;
      void createdAt;
      return rest;
    };
    expect(strip(rollEvent(universe, match, { now: 'T' }))).toEqual(strip(rollEvent(universe, match, { now: 'T' })));
  });

  it('different attempts give different seeds and the description does not change the deltas', () => {
    const first = rollEvent(universe, match, { attempt: 0 }).event;
    const second = rollEvent(universe, match, { attempt: 1 }).event;
    expect(first.seed).not.toBe(second.seed);
    expect(first.deltas).toEqual(second.deltas);
  });
});
