import { describe, it, expect } from 'vitest';
import { createEmptyUniverse } from '../schema.js';
import { stateOf } from '../constants.js';
import { getEligibleCandidates, isOnCooldown } from './eligibility.js';

const IDS = ['A', 'B', 'C', 'D', 'E'];

const wrestler = (id, extra = {}) => ({
  id,
  name: `Wrestler ${id}`,
  status: 'available',
  wins: 0,
  champion: false,
  notes: '',
  ...extra,
});
const rel = (fromId, toId, score) => ({ fromId, toId, score, state: stateOf(score), history: [] });
const event = (type, week, participantIds, state = 'accepted') => ({
  id: `e_${type}_${week}_${participantIds.join('')}_${state}`,
  type,
  week,
  participantIds,
  state,
  seed: 1,
  deltas: [],
  description: '',
  createdAt: '2026-01-01T00:00:00.000Z',
});
const match = (week, participantIds) => ({
  id: `m_${week}`,
  week,
  type: '1v1',
  participantIds,
  winnerIds: [participantIds[0]],
  recordedAt: '2026-01-01T00:00:00.000Z',
});
const universe = ({ ids = IDS, relationships = [], events = [], factions = [], week = 1 } = {}) => ({
  ...createEmptyUniverse(),
  week,
  wrestlers: ids.map((id) => wrestler(id)),
  relationships,
  events,
  factions,
});
const keys = (candidates) => candidates.map((c) => `${c.type}:${c.participantIds.join(',')}`).sort();
const typesOf = (candidates) => new Set(candidates.map((c) => c.type));
const deepFreeze = (o) => {
  Object.values(o).forEach((v) => v && typeof v === 'object' && deepFreeze(v));
  return Object.freeze(o);
};

describe('US-124 event eligibility', () => {
  it('AC 1: returns exactly the candidates that satisfy the rules', () => {
    const state = universe({
      relationships: [rel('A', 'B', 30), rel('B', 'A', 30), rel('C', 'A', -70)],
    });
    expect(keys(getEligibleCandidates(state, match(3, ['A', 'B'])))).toEqual(
      [
        'confrontation:A,B',
        'confrontation:B,A',
        'respect:A,B',
        'interference:C,B,A',
        'interference:D,A,B',
        'interference:D,B,A',
        'interference:E,A,B',
        'interference:E,B,A',
        'ambush:C,A',
        'betrayal:A,B',
        'betrayal:B,A',
        'faction:A,B',
      ].sort(),
    );
  });

  it('AC 1: a save needs an ally saviour; interference is dropped for a hostile helper', () => {
    const state = universe({ relationships: [rel('C', 'A', 40)] });
    const candidates = keys(getEligibleCandidates(state, match(3, ['A', 'B'])));
    expect(candidates).toContain('save:C,A,B');
    expect(candidates).not.toContain('save:D,A,B');
    const hostile = universe({ relationships: [rel('C', 'A', -30)] });
    const result = keys(getEligibleCandidates(hostile, match(3, ['A', 'B'])));
    expect(result).not.toContain('interference:C,A,B');
    expect(result).toContain('interference:C,B,A');
  });

  it('AC 1: only match participants anchor events, and an ambush needs hostility or high chaos', () => {
    const state = universe();
    expect(typesOf(getEligibleCandidates(state, match(1, ['A', 'B']))).has('ambush')).toBe(false);
    const chaotic = getEligibleCandidates(state, match(1, ['A', 'B']), { ...state.settings, chaos: 90 });
    expect(keys(chaotic)).toContain('ambush:D,A');
    const confrontations = getEligibleCandidates(state, match(1, ['A', 'B'])).filter(
      (c) => c.type === 'confrontation',
    );
    expect(confrontations.every((c) => c.participantIds.every((id) => ['A', 'B'].includes(id)))).toBe(true);
  });

  it('AC 1: a manual roll (null match) lets any wrestler fill any role', () => {
    const state = universe({ ids: ['A', 'B', 'C'] });
    const found = keys(getEligibleCandidates(state, null));
    expect(found).toContain('confrontation:C,A');
    expect(found).toContain('respect:B,C');
    expect(found).toContain('faction:A,B,C');
    expect(found).toContain('interference:C,A,B');
  });

  it('AC 1: inactive wrestlers are skipped and removed ids in the match are ignored', () => {
    const state = universe({ ids: ['A', 'B', 'C'] });
    state.wrestlers[2].status = 'inactive';
    expect(keys(getEligibleCandidates(state, match(1, ['A', 'B', 'C', 'GONE'])))).not.toContainEqual(
      expect.stringMatching(/C|GONE/),
    );
    expect(getEligibleCandidates(state, match(1, ['A', 'B'])).length).toBeGreaterThan(0);
  });

  it('AC 2: a type accepted in week 5 with cooldown 4 is blocked in weeks 5-8 and free in week 9', () => {
    const state = universe({
      relationships: [rel('C', 'A', -70)],
      events: [event('ambush', 5, ['D', 'E'])],
    });
    for (const week of [5, 6, 7, 8]) {
      expect(typesOf(getEligibleCandidates(state, match(week, ['A', 'B']))).has('ambush')).toBe(false);
    }
    expect(keys(getEligibleCandidates(state, match(9, ['A', 'B'])))).toContain('ambush:C,A');
    expect(isOnCooldown(state, 'ambush', ['C', 'A'], 8)).toBe(true);
    expect(isOnCooldown(state, 'ambush', ['C', 'A'], 9)).toBe(false);
  });

  it('AC 2: a rejected event counts at half weight (weeks 5-6 only) and a proposed one at full weight', () => {
    const rejected = universe({
      relationships: [rel('C', 'A', -70)],
      events: [event('ambush', 5, ['D', 'E'], 'rejected')],
    });
    const blocked = (state, week) =>
      !typesOf(getEligibleCandidates(state, match(week, ['A', 'B']))).has('ambush');
    expect([5, 6, 7].map((w) => blocked(rejected, w))).toEqual([true, true, false]);
    const proposed = universe({
      relationships: [rel('C', 'A', -70)],
      events: [event('ambush', 5, ['D', 'E'], 'proposed')],
    });
    expect([8, 9].map((w) => blocked(proposed, w))).toEqual([true, false]);
  });

  it('AC 3: the same pair and type inside the pair window is excluded, other pairs and types are not', () => {
    const state = universe({ events: [event('confrontation', 1, ['A', 'B'])] });
    const at3 = keys(getEligibleCandidates(state, match(3, ['A', 'B', 'C'])));
    expect(at3).not.toContain('confrontation:A,B');
    expect(at3).not.toContain('confrontation:B,A');
    expect(at3).toContain('confrontation:A,C');
    expect(at3).toContain('respect:A,B');
    expect(isOnCooldown(state, 'confrontation', ['B', 'A'], 3)).toBe(true);
    expect(isOnCooldown(state, 'confrontation', ['A', 'C'], 3)).toBe(false);
    expect(isOnCooldown(state, 'confrontation', ['A', 'B'], 5)).toBe(false);
  });

  it('AC 3: a rejected event blocks the pair for half the pair window', () => {
    const state = universe({ events: [event('confrontation', 1, ['A', 'B'], 'rejected')] });
    expect(isOnCooldown(state, 'confrontation', ['A', 'B'], 2)).toBe(true);
    expect(isOnCooldown(state, 'confrontation', ['A', 'B'], 3)).toBe(false);
  });

  it('AC 3: the same type and participant set cannot be accepted twice in a row, even long after', () => {
    const state = universe({ events: [event('confrontation', 1, ['A', 'B'])] });
    const later = keys(getEligibleCandidates(state, match(20, ['A', 'B', 'C'])));
    expect(later).not.toContain('confrontation:A,B');
    expect(later).not.toContain('confrontation:B,A');
    expect(later).toContain('confrontation:A,C');
    const interleaved = universe({
      events: [event('confrontation', 1, ['A', 'B']), event('confrontation', 10, ['C', 'D'])],
    });
    expect(keys(getEligibleCandidates(interleaved, match(30, ['A', 'B'])))).toContain('confrontation:A,B');
  });

  it('AC 3: removed wrestlers in history are ignored without errors', () => {
    const state = universe({ events: [event('confrontation', 1, ['A', 'B', 'GONE'])] });
    expect(keys(getEligibleCandidates(state, match(20, ['A', 'B'])))).not.toContain('confrontation:A,B');
    expect(keys(getEligibleCandidates(state, match(20, ['A', 'C'])))).toContain('confrontation:A,C');
  });

  it('AC 3: a wrestler in a live event the same week is excluded; a rejected one frees them', () => {
    const busy = universe({ events: [event('return', 3, ['A', 'C'])] });
    const found = getEligibleCandidates(busy, match(3, ['A', 'B', 'D']));
    expect(found.length).toBeGreaterThan(0);
    expect(found.some((c) => c.participantIds.some((id) => id === 'A' || id === 'C'))).toBe(false);
    const freed = universe({ events: [event('return', 3, ['A', 'C'], 'rejected')] });
    expect(keys(getEligibleCandidates(freed, match(3, ['A', 'B', 'D'])))).toContain('confrontation:A,B');
  });

  it('AC 3: respect is blocked when either direction is -80 or worse', () => {
    const blocked = universe({ relationships: [rel('B', 'A', -80)] });
    expect(keys(getEligibleCandidates(blocked, match(1, ['A', 'B'])))).not.toContain('respect:A,B');
    const allowed = universe({ relationships: [rel('B', 'A', -79)] });
    expect(keys(getEligibleCandidates(allowed, match(1, ['A', 'B'])))).toContain('respect:A,B');
  });

  it('AC 3: a faction is dropped for sworn enemies and for wrestlers already in an active faction', () => {
    const enemies = universe({ relationships: [rel('A', 'B', -60)] });
    expect(typesOf(getEligibleCandidates(enemies, match(1, ['A', 'B']))).has('faction')).toBe(false);
    const faction = { id: 'f_1', name: 'F', memberIds: ['A', 'C'], formedEventId: 'e_x', active: true };
    const inFaction = universe({ factions: [faction] });
    const found = keys(getEligibleCandidates(inFaction, match(1, ['A', 'B', 'D'])));
    expect(found).toContain('faction:B,D');
    expect(found).not.toContain('faction:A,B');
    const disbanded = universe({ factions: [{ ...faction, active: false }] });
    expect(keys(getEligibleCandidates(disbanded, match(1, ['A', 'B'])))).toContain('faction:A,B');
  });

  it('AC 4: betrayal is excluded without an ally relationship and present with one (score 20+)', () => {
    const none = universe();
    expect(typesOf(getEligibleCandidates(none, match(1, ['A', 'B']))).has('betrayal')).toBe(false);
    const nearly = universe({ relationships: [rel('A', 'B', 19)] });
    expect(typesOf(getEligibleCandidates(nearly, match(1, ['A', 'B']))).has('betrayal')).toBe(false);
    const allied = universe({ relationships: [rel('A', 'B', 20)] });
    expect(keys(getEligibleCandidates(allied, match(1, ['A', 'B'])))).toEqual(
      expect.arrayContaining(['betrayal:A,B', 'betrayal:B,A']),
    );
  });

  it('AC 5: fewer than 2 wrestlers gives an empty list and no error', () => {
    expect(getEligibleCandidates(universe({ ids: [] }), null)).toEqual([]);
    expect(getEligibleCandidates(universe({ ids: ['A'] }), null)).toEqual([]);
    expect(getEligibleCandidates(universe({ ids: ['A'] }), match(1, ['A']))).toEqual([]);
    expect(getEligibleCandidates(universe({ ids: [] }), match(1, ['A', 'B']))).toEqual([]);
  });

  it('AC 5: a big roster is capped at 200 candidates in a stable order', () => {
    const ids = Array.from({ length: 12 }, (_, i) => `W${i}`);
    const state = universe({ ids });
    const first = getEligibleCandidates(state, null);
    expect(first).toHaveLength(200);
    expect(getEligibleCandidates(state, null)).toEqual(first);
    expect(first[0]).toEqual({ type: 'confrontation', participantIds: ['W0', 'W1'] });
  });

  it('AC 6: title data is only read; a deeply frozen state neither throws nor changes', () => {
    const state = universe({ relationships: [rel('A', 'B', 30)], events: [event('ambush', 1, ['C', 'D'])] });
    state.wrestlers[0].champion = true;
    state.wrestlers[1].status = 'title-shot';
    const snapshot = JSON.stringify(state);
    deepFreeze(state);
    expect(() => getEligibleCandidates(state, match(2, ['A', 'B']))).not.toThrow();
    expect(() => isOnCooldown(state, 'ambush', ['C', 'D'], 2)).not.toThrow();
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});
