// Single orchestrator of the simulation: roll -> select -> build -> describe (US-127).
// Pure: the clock is injected as `now`; all randomness comes from seeded streams.
import { createRng, deriveSeed } from './rng.js';
import { selectEvent } from './select.js';
import { buildProposal } from './consequences.js';
import { describeEvent } from './describe.js';

/**
 * Rolls at most one event proposal for a recorded match result.
 * `attempt` = number of stored events with the same matchId (so repeated manual generation
 * differs); a reroll passes `rerollCount`, `forced: true` and `excludeKey`.
 * `forced` skips the frequency roll only. Optional AI text is applied later by the caller.
 * @param {import('../schema.js').Universe} universe
 * @param {{id: string, week: number, seed?: number}} matchResult
 * @param {{forced?: boolean, excludeKey?: string, rerollCount?: number, attempt?: number, now?: string}} [options]
 * @returns {{event: object} | {noEvent: true}}
 */
export function rollEvent(
  universe,
  matchResult,
  { forced = false, excludeKey, rerollCount = 0, attempt = 0, now } = {},
) {
  const base = universe.settings.seed ?? matchResult.seed;
  const seed = deriveSeed(deriveSeed(base, attempt), rerollCount);
  const rng = createRng(seed);

  const candidate = selectEvent(universe, matchResult, universe.settings, rng, { forced, excludeKey });
  if (!candidate) return { noEvent: true };

  const event = buildProposal(candidate, universe, rng, {
    seed,
    rerollCount,
    matchId: matchResult.id,
    week: matchResult.week,
    now,
  });
  const description = describeEvent(event, universe, createRng(deriveSeed(seed, 0)));
  return { event: { ...event, description } };
}
