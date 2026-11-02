// Event type catalogue and tunable simulation defaults (US-123).
// DEFAULT_SETTINGS and the other shared constants are owned by ../constants.js
// (US-113); import them from there, never redefine or re-export them here.
import { EVENT_TYPE_NAMES } from '../constants.js';

/** Rarity tiers and their default selection weights. */
export const TIERS = {
  common: { weight: 70 },
  uncommon: { weight: 25 },
  rare: { weight: 5 },
};

/** Weeks of match/event history that influence the next roll (US-125). */
export const HISTORY_WINDOW_WEEKS = 4;

/** Events a storyline needs before a title-shot suggestion is made (US-126). */
export const SUGGESTION_MIN_STORYLINE_EVENTS = 2;

/** Random +/- jitter applied to relationship deltas, scaled by settings.chaos (assumption; tuned in US-126). */
export const CHAOS_DELTA_JITTER = 2;

/**
 * Event types keyed by id. `roles` map to `participantIds` positions (a = index 0 ...).
 * Cooldowns: common 2 / uncommon 4 / rare 8 weeks; pair cooldown is 2x (assumption, PO tuning).
 * Per-type relationship `deltas` are added by US-126.
 */
export const EVENT_TYPES = {
  confrontation: {
    id: 'confrontation',
    label: 'Confrontation',
    tier: 'common',
    minParticipants: 2,
    maxParticipants: 2,
    cooldownWeeks: 2,
    pairCooldownWeeks: 4,
    roles: ['a', 'b'],
    relationRule: 'none',
  },
  respect: {
    id: 'respect',
    label: 'Respect',
    tier: 'common',
    minParticipants: 2,
    maxParticipants: 2,
    cooldownWeeks: 2,
    pairCooldownWeeks: 4,
    roles: ['a', 'b'],
    relationRule: 'notEnemies',
  },
  interference: {
    id: 'interference',
    label: 'Interference',
    tier: 'uncommon',
    minParticipants: 3,
    maxParticipants: 3,
    cooldownWeeks: 4,
    pairCooldownWeeks: 8,
    roles: ['helper', 'helped', 'hurt'],
    relationRule: 'helperNotHostile',
  },
  save: {
    id: 'save',
    label: 'Save',
    tier: 'uncommon',
    minParticipants: 3,
    maxParticipants: 3,
    cooldownWeeks: 4,
    pairCooldownWeeks: 8,
    roles: ['saviour', 'saved', 'attacker'],
    relationRule: 'saviourAlly',
  },
  ambush: {
    id: 'ambush',
    label: 'Ambush',
    tier: 'uncommon',
    minParticipants: 2,
    maxParticipants: 2,
    cooldownWeeks: 4,
    pairCooldownWeeks: 8,
    roles: ['attacker', 'victim'],
    relationRule: 'hostileOrChaos',
  },
  betrayal: {
    id: 'betrayal',
    label: 'Betrayal',
    tier: 'rare',
    minParticipants: 2,
    maxParticipants: 2,
    cooldownWeeks: 8,
    pairCooldownWeeks: 16,
    roles: ['betrayer', 'betrayed'],
    relationRule: 'priorAlly',
  },
  faction: {
    id: 'faction',
    label: 'Faction',
    tier: 'rare',
    minParticipants: 2,
    maxParticipants: 3,
    cooldownWeeks: 8,
    pairCooldownWeeks: 16,
    roles: ['member'],
    relationRule: 'factionFormable',
  },
  return: {
    id: 'return',
    label: 'Return',
    tier: 'rare',
    minParticipants: 2,
    maxParticipants: 4,
    cooldownWeeks: 8,
    pairCooldownWeeks: 16,
    roles: ['returner', 'other', 'other', 'other'],
    relationRule: 'none',
    requiresInactiveWrestler: true,
  },
};

const isNonNegativeInt = (n) => Number.isInteger(n) && n >= 0;

/**
 * Check a catalogue and tier table. Returns a list of plain-language problems;
 * an empty list means the configuration is valid.
 * @param {Record<string, object>} [types]
 * @param {Record<string, {weight: number}>} [tiers]
 * @returns {string[]}
 */
export function validateConfig(types = EVENT_TYPES, tiers = TIERS) {
  const errors = [];

  for (const [name, tier] of Object.entries(tiers)) {
    if (!Number.isFinite(tier?.weight) || tier.weight <= 0) {
      errors.push(`Tier "${name}" needs a weight greater than 0.`);
    }
  }

  for (const [key, t] of Object.entries(types)) {
    if (!Object.hasOwn(tiers, t.tier)) {
      errors.push(`Event type "${key}" uses unknown tier "${t.tier}".`);
    }
    if (!(t.minParticipants >= 1) || t.minParticipants > t.maxParticipants) {
      errors.push(`Event type "${key}" needs minParticipants of at least 1 and no more than maxParticipants.`);
    }
    if (!isNonNegativeInt(t.cooldownWeeks) || !isNonNegativeInt(t.pairCooldownWeeks)) {
      errors.push(`Event type "${key}" needs cooldowns that are whole numbers of weeks, 0 or more.`);
    }
    if (!Array.isArray(t.roles) || (t.roles.length !== 1 && t.roles.length !== t.maxParticipants)) {
      errors.push(`Event type "${key}" needs one role per participant (maxParticipants).`);
    }
  }

  const actual = Object.keys(types).sort().join(',');
  const expected = [...EVENT_TYPE_NAMES].sort().join(',');
  if (actual !== expected) {
    errors.push(`Catalogue types (${actual}) must match the known event types (${expected}).`);
  }

  return errors;
}
