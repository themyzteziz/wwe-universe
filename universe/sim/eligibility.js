// Which event candidates may be rolled right now (US-124). Pure and read-only:
// champion / title-shot data is never touched, a wrestler's `status` is only
// read to skip inactive ones.
import { ENEMY_MAX } from '../constants.js';
import { getRelationship, stateOf } from '../relationships.js';
import { EVENT_TYPES } from './config.js';

/** Respect is blocked when either direction scores at or below this (assumption, PO tuning). */
const RESPECT_BLOCK_MAX = -80;
/** An ambush needs no hostility once settings.chaos reaches this (assumption, PO tuning). */
const AMBUSH_CHAOS_MIN = 75;
/** Upper bound on candidates per roll; keeps a roll O(200) on big rosters. */
const MAX_CANDIDATES = 200;

const score = (state, from, to) => getRelationship(state, from, to)?.score ?? 0;
const isAlly = (state, a, b) =>
  stateOf(score(state, a, b)) === 'ally' || stateOf(score(state, b, a)) === 'ally';
const isHostile = (state, from, to) => {
  const s = stateOf(score(state, from, to));
  return s === 'rival' || s === 'enemy';
};

/** relationRule name -> (state, participantIds in role order, settings) => boolean */
const RELATION_RULES = {
  none: () => true,
  notEnemies: (s, [a, b]) =>
    score(s, a, b) > RESPECT_BLOCK_MAX && score(s, b, a) > RESPECT_BLOCK_MAX,
  helperNotHostile: (s, [helper, helped]) => !isHostile(s, helper, helped),
  saviourAlly: (s, [saviour, saved]) => isAlly(s, saviour, saved),
  hostileOrChaos: (s, [attacker, victim], settings) =>
    isHostile(s, attacker, victim) || (settings?.chaos ?? 0) >= AMBUSH_CHAOS_MIN,
  priorAlly: (s, [a, b]) => isAlly(s, a, b),
  // Nobody may already be in an active faction, and no pair may be sworn enemies.
  factionFormable: (s, ids) =>
    !s.factions.some((f) => f.active && f.memberIds.some((id) => ids.includes(id))) &&
    ids.every((a) => ids.every((b) => a === b || score(s, a, b) > ENEMY_MAX)),
};

// Candidate generators lazily yield participant arrays in role order.
// `anchors` are the match participants, `free` any usable wrestler, `others`
// the wrestlers allowed to step in from outside the match.
function* orderedPairs(list) {
  for (const a of list) for (const b of list) if (a !== b) yield [a, b];
}
function* unorderedPairs(list) {
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) yield [list[i], list[j]];
  }
}
function* helpers({ anchors, others }) {
  for (const a of others) {
    for (const [b, c] of orderedPairs(anchors)) if (a !== b && a !== c) yield [a, b, c];
  }
}
function* groups({ anchors }) {
  yield* unorderedPairs(anchors);
  for (let i = 0; i < anchors.length; i++) {
    for (let j = i + 1; j < anchors.length; j++) {
      for (let k = j + 1; k < anchors.length; k++) yield [anchors[i], anchors[j], anchors[k]];
    }
  }
}
function* ambushes({ free, anchors }) {
  for (const a of free) for (const b of anchors) if (a !== b) yield [a, b];
}

// `return` has no generator on purpose: it needs an inactive wrestler, which v1 never has.
const GENERATORS = {
  confrontation: ({ anchors }) => orderedPairs(anchors),
  respect: ({ anchors }) => unorderedPairs(anchors),
  interference: helpers,
  save: helpers,
  ambush: ambushes,
  betrayal: ({ anchors }) => orderedPairs(anchors),
  faction: groups,
};

/** Events of a type that count for cooldowns, with the number of weeks each one blocks. */
function blockingWindows(state, type, weeks) {
  const windows = [];
  for (const ev of state.events) {
    if (ev.type !== type) continue;
    if (ev.state === 'accepted' || ev.state === 'proposed') windows.push({ ev, window: weeks });
    else if (ev.state === 'rejected') windows.push({ ev, window: Math.floor(weeks / 2) });
  }
  return windows;
}

function typeBlocked(state, def, week) {
  return blockingWindows(state, def.id, def.cooldownWeeks).some(
    ({ ev, window }) => week - ev.week < window,
  );
}

function pairBlocked(state, def, participantIds, week) {
  return blockingWindows(state, def.id, def.pairCooldownWeeks).some(({ ev, window }) => {
    if (week - ev.week >= window) return false;
    return participantIds.filter((id) => ev.participantIds.includes(id)).length >= 2;
  });
}

/**
 * True when the type, or the same pair of wrestlers with this type, is still
 * cooling down in `week`. Rejected events count at half weight.
 * @param {import('../schema.js').Universe} state
 * @param {string} type
 * @param {string[]} participantIds
 * @param {number} week
 * @returns {boolean}
 */
export function isOnCooldown(state, type, participantIds, week) {
  const def = EVENT_TYPES[type];
  if (!def) return false;
  return typeBlocked(state, def, week) || pairBlocked(state, def, participantIds, week);
}

/** The latest accepted event of this type has the same set of (still existing) wrestlers. */
function repeatsLastAccepted(state, type, participantIds) {
  let last = null;
  for (const ev of state.events) {
    if (ev.type === type && ev.state === 'accepted' && (!last || ev.week >= last.week)) last = ev;
  }
  if (!last) return false;
  const exists = new Set(state.wrestlers.map((w) => w.id));
  const previous = new Set(last.participantIds.filter((id) => exists.has(id)));
  return previous.size === participantIds.length && participantIds.every((id) => previous.has(id));
}

/**
 * Event candidates that may be rolled after `matchResult` (or manually when it
 * is null). An empty or tiny universe gives [] and never throws.
 * @param {import('../schema.js').Universe} state
 * @param {import('../schema.js').MatchResult | null} matchResult
 * @param {import('../constants.js').DEFAULT_SETTINGS} [settings]
 * @returns {{type: string, participantIds: string[]}[]}
 */
export function getEligibleCandidates(state, matchResult, settings = state.settings) {
  const roster = state.wrestlers.filter((w) => w.status !== 'inactive');
  if (roster.length < 2) return [];

  const week = matchResult?.week ?? state.week;
  // A wrestler already in a live event this week cannot be in another one.
  const busy = new Set(
    state.events
      .filter((ev) => ev.week === week && ev.state !== 'rejected')
      .flatMap((ev) => ev.participantIds),
  );
  const free = roster.map((w) => w.id).filter((id) => !busy.has(id));
  const anchors = matchResult ? free.filter((id) => matchResult.participantIds.includes(id)) : free;
  const others = matchResult ? free.filter((id) => !anchors.includes(id)) : free;
  const pool = { free, anchors, others };

  const candidates = [];
  for (const [type, generate] of Object.entries(GENERATORS)) {
    const def = EVENT_TYPES[type];
    if (typeBlocked(state, def, week)) continue;
    for (const participantIds of generate(pool)) {
      const ok =
        participantIds.length >= def.minParticipants &&
        participantIds.length <= def.maxParticipants &&
        new Set(participantIds).size === participantIds.length &&
        RELATION_RULES[def.relationRule](state, participantIds, settings) &&
        !pairBlocked(state, def, participantIds, week) &&
        !repeatsLastAccepted(state, type, participantIds);
      if (!ok) continue;
      candidates.push({ type, participantIds });
      if (candidates.length >= MAX_CANDIDATES) return candidates;
    }
  }
  return candidates;
}
