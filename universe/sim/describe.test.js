import { describe, expect, it } from 'vitest';
import { EVENT_TYPES } from './config.js';
import { TEMPLATES, describeEvent } from './describe.js';
import { createRng } from './rng.js';

const IDS = ['w1', 'w2', 'w3', 'w4'];
const NAMES = ['Alpha', 'Bravo', 'Charlie', 'Delta'];

const baseState = () => ({
  wrestlers: IDS.map((id, i) => ({ id, name: NAMES[i] })),
  matchResults: [],
  events: [],
  storylines: [],
});

const eventOf = (type, extra = {}) => ({
  id: 'e_new',
  type,
  week: 5,
  participantIds: IDS.slice(0, EVENT_TYPES[type].maxParticipants),
  deltas: [{ fromId: 'w1', toId: 'w2', delta: -5 }],
  ...extra,
});

const fixedPick = (i) => ({ pick: (arr) => arr[i % arr.length] });
const TYPES = Object.keys(EVENT_TYPES);
const LEAK = /\{[a-z]+\}|\{|\}|undefined|null| {2}| [.,!?;:]/;

describe('templates', () => {
  it('has at least 3 templates per catalogued type, each with every role token and a history slot', () => {
    expect(Object.keys(TEMPLATES).sort()).toEqual([...TYPES].sort());
    for (const type of TYPES) {
      expect(TEMPLATES[type].length).toBeGreaterThanOrEqual(3);
      const roles = EVENT_TYPES[type].roles;
      const tokens = type === 'faction' ? ['{members}']
        : type === 'return' ? ['{a}', '{others}']
          : roles.map((_, i) => `{${'abc'[i]}}`);
      for (const t of TEMPLATES[type]) {
        for (const token of tokens) expect(t, `${type}: ${t}`).toContain(token);
        expect(t).toContain('{history}');
      }
    }
  });

  it('contains no real-world wrestling company names', () => {
    const all = Object.values(TEMPLATES).flat().join(' ').toLowerCase();
    for (const word of ['wwe', 'wwf', 'raw', 'smackdown', 'nxt', 'aew']) {
      expect(all).not.toMatch(new RegExp(`\\b${word}\\b`));
    }
  });
});

describe('AC 1: text', () => {
  it('every type x template renders non-empty text naming all participants', () => {
    for (const type of TYPES) {
      const event = eventOf(type);
      TEMPLATES[type].forEach((_, i) => {
        const text = describeEvent(event, baseState(), fixedPick(i));
        expect(text.length).toBeGreaterThan(0);
        for (const id of event.participantIds) {
          expect(text, `${type} #${i}: ${text}`).toContain(NAMES[IDS.indexOf(id)]);
        }
      });
    }
  });

  it('rejects an unknown type and too few participants', () => {
    expect(() => describeEvent(eventOf('confrontation', { type: 'nope' }), baseState(), fixedPick(0))).toThrow(TypeError);
    expect(() => describeEvent(eventOf('save', { participantIds: ['w1', 'w2'] }), baseState(), fixedPick(0))).toThrow(RangeError);
  });

  it('names a removed wrestler from the former-wrestler map', () => {
    const state = { ...baseState(), formerWrestlers: { w2: 'Bravo' } };
    state.wrestlers = state.wrestlers.filter((w) => w.id !== 'w2');
    expect(describeEvent(eventOf('confrontation'), state, fixedPick(0))).toContain('Bravo');
  });
});

describe('AC 2: continuity', () => {
  it('adds a clause from the last decisive match between the pair', () => {
    const state = {
      ...baseState(),
      matchResults: [
        { id: 'm1', week: 2, participantIds: ['w1', 'w2'], winnerIds: ['w2'] },
        { id: 'm2', week: 3, participantIds: ['w1', 'w2'], winnerIds: ['w1'] },
      ],
    };
    const text = describeEvent(eventOf('confrontation'), state, fixedPick(0));
    expect(text).toBe("Alpha squares up to Bravo in the middle of the ring. This follows Bravo's loss to Alpha in week 3.");
  });

  it('uses any pair of participants in a multi-man match', () => {
    const state = {
      ...baseState(),
      matchResults: [{ id: 'm1', week: 4, participantIds: ['w1', 'w2', 'w3'], winnerIds: ['w3'] }],
    };
    expect(describeEvent(eventOf('ambush'), state, fixedPick(0))).not.toContain('week 4');
    expect(describeEvent(eventOf('save'), state, fixedPick(0))).toContain("Alpha's loss to Charlie in week 4");
  });

  it('ignores matches without a single decisive result for the pair', () => {
    const state = {
      ...baseState(),
      matchResults: [
        { id: 'm1', week: 1, participantIds: ['w1', 'w2'], winnerIds: ['w1', 'w2'] },
        { id: 'm2', week: 2, participantIds: ['w1', 'w3'], winnerIds: ['w1'] },
      ],
    };
    expect(describeEvent(eventOf('confrontation'), state, fixedPick(0))).not.toContain('week');
  });

  it('falls back to the last accepted event between the pair', () => {
    const state = {
      ...baseState(),
      events: [
        { id: 'e1', type: 'ambush', week: 2, state: 'accepted', participantIds: ['w2', 'w1'] },
        { id: 'e2', type: 'respect', week: 4, state: 'rejected', participantIds: ['w1', 'w2'] },
        { id: 'e3', type: 'save', week: 4, state: 'proposed', participantIds: ['w1', 'w2'] },
      ],
    };
    expect(describeEvent(eventOf('confrontation'), state, fixedPick(0))).toBe(
      'Alpha squares up to Bravo in the middle of the ring. Their ambush in week 2 is not forgotten.',
    );
  });

  it('falls back to an open storyline, but not a resolved one', () => {
    const open = { ...baseState(), storylines: [{ id: 's1', status: 'open', participantIds: ['w1', 'w2'] }] };
    expect(describeEvent(eventOf('confrontation'), open, fixedPick(0))).toMatch(/ The feud between them continues\.$/);
    const closed = { ...baseState(), storylines: [{ id: 's1', status: 'resolved', participantIds: ['w1', 'w2'] }] };
    expect(describeEvent(eventOf('confrontation'), closed, fixedPick(0))).not.toContain('feud');
  });

  it('prefers match, then event, then storyline', () => {
    const state = {
      ...baseState(),
      matchResults: [{ id: 'm1', week: 1, participantIds: ['w1', 'w2'], winnerIds: ['w1'] }],
      events: [{ id: 'e1', type: 'ambush', week: 2, state: 'accepted', participantIds: ['w1', 'w2'] }],
      storylines: [{ id: 's1', status: 'open', participantIds: ['w1', 'w2'] }],
    };
    expect(describeEvent(eventOf('confrontation'), state, fixedPick(0))).toContain('loss to Alpha in week 1');
    state.matchResults = [];
    expect(describeEvent(eventOf('confrontation'), state, fixedPick(0))).toContain('Their ambush in week 2');
    state.events = [];
    expect(describeEvent(eventOf('confrontation'), state, fixedPick(0))).toContain('The feud between them');
  });

  it('leaves no placeholders, double spaces or stray punctuation with or without history, seeds 1..200', () => {
    const withHistory = {
      ...baseState(),
      matchResults: [{ id: 'm1', week: 3, participantIds: IDS, winnerIds: ['w1'] }],
    };
    for (let seed = 1; seed <= 200; seed += 1) {
      for (const type of TYPES) {
        for (const state of [baseState(), withHistory]) {
          const text = describeEvent(eventOf(type), state, createRng(seed));
          expect(text, `${type} seed ${seed}`).not.toMatch(LEAK);
          expect(text).toBe(text.trim());
        }
      }
    }
  });
});

describe('AC 3: deterministic', () => {
  it('same seed gives the same text, and each type yields at least 2 distinct texts over 20 seeds', () => {
    for (const type of TYPES) {
      const texts = new Set();
      for (let seed = 1; seed <= 20; seed += 1) {
        const a = describeEvent(eventOf(type), baseState(), createRng(seed));
        expect(describeEvent(eventOf(type), baseState(), createRng(seed))).toBe(a);
        texts.add(a);
      }
      expect(texts.size).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('AC 4: independence', () => {
  it('different descriptions leave the event and its deltas untouched', () => {
    const event = Object.freeze(eventOf('ambush'));
    const deltas = structuredClone(event.deltas);
    const a = describeEvent(event, baseState(), fixedPick(0));
    const b = describeEvent(event, baseState(), fixedPick(1));
    expect(a).not.toBe(b);
    expect(event.deltas).toEqual(deltas);
  });

  it('engine modules never read a description', () => {
    const sources = import.meta.glob(
      ['./eligibility.js', './select.js', './consequences.js'],
      { query: '?raw', import: 'default', eager: true },
    );
    for (const [file, code] of Object.entries(sources)) {
      expect(code, file).not.toMatch(/description/);
    }
  });

  it('text code uses no unseeded randomness or clock', () => {
    const sources = import.meta.glob(['./describe.js', './engine.js'], { query: '?raw', import: 'default', eager: true });
    expect(Object.keys(sources).length).toBe(2);
    for (const code of Object.values(sources)) expect(code).not.toMatch(/Math\.random|Date\.now/);
  });
});

describe('AC 5: renames', () => {
  it('the stored description is plain text and does not change when a wrestler is renamed', () => {
    const state = baseState();
    const event = eventOf('ambush');
    event.description = describeEvent(event, state, createRng(7));
    const stored = event.description;
    expect(stored).toContain('Alpha');

    const renamed = { ...state, wrestlers: state.wrestlers.map((w) => (w.id === 'w1' ? { ...w, name: 'Omega' } : w)) };
    expect(describeEvent(event, renamed, createRng(7))).toContain('Omega');
    expect(event.description).toBe(stored);
    expect(event.description).toContain('Alpha');
  });
});
