// PLACEHOLDER until US-125 lands: engine.js (US-127) imports `selectEvent` from here.
// US-125 replaces this whole file with the real implementation (same signature):
//   selectEvent(universe, matchResult, settings, rng, {forced, excludeKey}) -> candidate | null
export function selectEvent() {
  throw new Error('selectEvent is not implemented yet (US-125).');
}
