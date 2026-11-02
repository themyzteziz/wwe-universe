// History-aware weighted event selection (US-125). Pure: no I/O, randomness only via the injected rng.
import { HISTORY_WINDOW_WEEKS, TIERS, EVENT_TYPES } from './config.js';
import { getEligibleCandidates } from './eligibility.js';
import { getRelationship } from '../relationships.js';

const clampPercent = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
};

const sharedCount = (ids, others = []) => ids.filter((id) => others.includes(id)).length;

function intensityOf(state, ids) {
  let sum = 0;
  let pairs = 0;
  for (const from of ids) {
    for (const to of ids) {
      if (from === to) continue;
      pairs += 1;
      const rel = getRelationship(state, from, to);
      if (rel) sum += Math.abs(rel.score) / 100;
    }
  }
  return pairs === 0 ? 0 : sum / pairs;
}

/** History term h (0..4): open storyline (2) + recent accepted event (1) + relationship intensity (0..1). */
function historyTerm(state, { participantIds }) {
  const openStoryline = (state.storylines ?? []).some(
    (s) => s.status === 'open' && sharedCount(participantIds, s.participantIds) >= 2,
  );
  const recentEvent = (state.events ?? []).some(
    (e) =>
      e.state === 'accepted' &&
      e.week >= state.week - HISTORY_WINDOW_WEEKS &&
      sharedCount(participantIds, e.participantIds) >= 2,
  );
  return (openStoryline ? 2 : 0) + (recentEvent ? 1 : 0) + intensityOf(state, participantIds);
}

/**
 * Selection probability of each candidate: history-weighted tier odds blended with
 * uniform odds by chaos (chaos 0 = history only, 100 = uniform).
 * @param {object} state universe
 * @param {{type: string, participantIds: string[]}[]} candidates
 * @param {{historySensitivity: number, chaos: number}} settings
 * @returns {number[]} probabilities summing to 1, in candidate order ([] when there are none)
 */
export function computeWeights(state, candidates, settings) {
  const n = candidates.length;
  if (n === 0) return [];
  const s = clampPercent(settings.historySensitivity) / 100;
  const c = clampPercent(settings.chaos) / 100;
  const w = candidates.map(
    (cand) => TIERS[EVENT_TYPES[cand.type].tier].weight * (1 + s * historyTerm(state, cand)),
  );
  const total = w.reduce((a, b) => a + b, 0);
  return w.map((x) => (1 - c) * (x / total) + c / n);
}

/**
 * Rolls whether an event happens after a match and, if so, which one.
 * Always consumes exactly one rng.next() for the frequency roll (even with `force` or no
 * candidates) so seeded streams stay aligned; `force` ignores the roll's result.
 * @param {object} state universe
 * @param {object} matchResult the just-recorded match
 * @param {object} settings universe settings
 * @param {{next: () => number, weightedPick: Function}} rng
 * @param {{force?: boolean}} [options]
 * @returns {{type: string, participantIds: string[]} | null}
 */
export function selectEvent(state, matchResult, settings, rng, { force = false } = {}) {
  const candidates = getEligibleCandidates(state, matchResult, settings);
  const passed = rng.next() * 100 < clampPercent(settings.eventFrequency);
  if ((!passed && !force) || candidates.length === 0) return null;
  return rng.weightedPick(candidates, computeWeights(state, candidates, settings));
}
