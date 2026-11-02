import { describe, it, expect } from 'vitest';
import * as simConfig from './config.js';
import { DEFAULT_SETTINGS, EVENT_TYPE_NAMES } from '../constants.js';

const { EVENT_TYPES, TIERS, validateConfig } = simConfig;

describe('US-123 event type catalogue', () => {
  it('AC 1: exports all 8 types, each valid, with tier and participants', () => {
    expect(Object.keys(EVENT_TYPES).sort()).toEqual([...EVENT_TYPE_NAMES].sort());
    expect(Object.keys(EVENT_TYPES)).toHaveLength(8);
    expect(validateConfig()).toEqual([]);
    for (const [key, t] of Object.entries(EVENT_TYPES)) {
      expect(t.id).toBe(key);
      expect(TIERS[t.tier]).toBeDefined();
      expect(t.minParticipants).toBeGreaterThanOrEqual(1);
      expect(typeof t.relationRule).toBe('string');
    }
  });

  it('AC 1: default tiers, weights and cooldowns follow the story', () => {
    expect(TIERS).toEqual({ common: { weight: 70 }, uncommon: { weight: 25 }, rare: { weight: 5 } });
    const tiers = Object.fromEntries(Object.values(EVENT_TYPES).map((t) => [t.id, t.tier]));
    expect(tiers).toEqual({
      confrontation: 'common',
      respect: 'common',
      interference: 'uncommon',
      save: 'uncommon',
      ambush: 'uncommon',
      betrayal: 'rare',
      faction: 'rare',
      return: 'rare',
    });
    const cooldown = { common: 2, uncommon: 4, rare: 8 };
    for (const t of Object.values(EVENT_TYPES)) {
      expect(t.cooldownWeeks).toBe(cooldown[t.tier]);
      expect(t.pairCooldownWeeks).toBe(cooldown[t.tier] * 2);
    }
    expect(EVENT_TYPES.betrayal.relationRule).toBe('priorAlly');
    expect(EVENT_TYPES.save.relationRule).toBe('saviourAlly');
    expect(EVENT_TYPES.ambush.relationRule).toBe('hostileOrChaos');
  });

  it('AC 2: DEFAULT_SETTINGS comes only from constants.js, not sim/config.js', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      eventFrequency: 25,
      chaos: 50,
      historySensitivity: 50,
      autoPropose: true,
      seed: null,
      aiEnabled: false,
      aiEndpoint: '',
    });
    expect('DEFAULT_SETTINGS' in simConfig).toBe(false);
  });

  it('AC 3: validateConfig flags weights <= 0 and unknown tiers', () => {
    const zeroWeight = structuredClone(TIERS);
    zeroWeight.rare.weight = 0;
    expect(validateConfig(EVENT_TYPES, zeroWeight).some((e) => e.includes('"rare"'))).toBe(true);

    const negative = structuredClone(TIERS);
    negative.common.weight = -1;
    expect(validateConfig(EVENT_TYPES, negative)).not.toEqual([]);

    const badTier = structuredClone(EVENT_TYPES);
    badTier.save.tier = 'epic';
    expect(validateConfig(badTier).some((e) => e.includes('unknown tier "epic"'))).toBe(true);
  });

  it('AC 3: validateConfig flags other broken entries', () => {
    const types = structuredClone(EVENT_TYPES);
    types.respect.minParticipants = 3;
    types.save.cooldownWeeks = -1;
    types.ambush.roles = ['a'.repeat(1), 'b', 'c'];
    delete types.faction;
    expect(validateConfig(types)).toHaveLength(4);
  });

  it('AC 4: return is flagged requiresInactiveWrestler, others are not', () => {
    expect(EVENT_TYPES.return.requiresInactiveWrestler).toBe(true);
    for (const t of Object.values(EVENT_TYPES).filter((x) => x.id !== 'return')) {
      expect(t.requiresInactiveWrestler).toBeUndefined();
    }
  });
});
