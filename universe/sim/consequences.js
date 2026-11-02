// PLACEHOLDER until US-126 lands: engine.js (US-127) imports `buildProposal` from here.
// US-126 replaces this whole file with the real implementation (same signature):
//   buildProposal(candidate, universe, rng, {seed, rerollCount, matchId, week, now}) -> event
export function buildProposal() {
  throw new Error('buildProposal is not implemented yet (US-126).');
}
