// Pure match-result transitions on a Universe. They become the `recordResult` and
// `undoLastResult` reducer cases in UniverseContext. No clock, no randomness: the
// caller supplies `id`, `recordedAt` and `seed` in the payload.

function addWins(wrestlers, ids, amount) {
  return wrestlers.map((w) =>
    ids.includes(w.id) ? { ...w, wins: Math.max(0, w.wins + amount) } : w,
  );
}

/**
 * Stores a MatchResult and gives each winner one win. Never touches status or champion.
 * Returns the same universe when the payload is not a valid new result: a winner that
 * is not a participant, no winner at all, or a result with this id already recorded.
 * @param {import('./schema.js').Universe} universe
 * @param {{id: string, recordedAt: string, seed: number, week: number, type: string,
 *   participantIds: string[], winnerIds: string[]}} payload
 */
export function recordResult(universe, payload) {
  const { id, recordedAt, seed, week, type, participantIds, winnerIds, playerWrestlerId } = payload;
  if (!Array.isArray(participantIds) || !Array.isArray(winnerIds) || winnerIds.length === 0) {
    return universe;
  }
  if (!winnerIds.every((winnerId) => participantIds.includes(winnerId))) return universe;
  if (universe.matchResults.some((m) => m.id === id)) return universe;
  if (playerWrestlerId != null && !participantIds.includes(playerWrestlerId)) return universe;

  const result = { id, week, type, participantIds, winnerIds, recordedAt, seed,
    ...(playerWrestlerId != null ? { playerWrestlerId } : {}),
  };
  return {
    ...universe,
    wrestlers: addWins(universe.wrestlers, winnerIds, 1),
    matchResults: [...universe.matchResults, result],
  };
}

/**
 * Removes the most recent MatchResult and takes one win from each winner that is still
 * on the roster (never below 0). Winners that were removed are skipped without error.
 * @param {import('./schema.js').Universe} universe
 */
export function undoLastResult(universe) {
  const last = universe.matchResults.at(-1);
  if (!last) return universe;
  return {
    ...universe,
    wrestlers: addWins(universe.wrestlers, last.winnerIds, -1),
    matchResults: universe.matchResults.slice(0, -1),
  };
}
