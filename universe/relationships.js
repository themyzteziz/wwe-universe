import { SCORE_MAX, SCORE_MIN, stateOf } from "./constants.js";
import { newId } from "./schema.js";

export { stateOf };

export class RelationshipError extends Error {
  constructor(message) {
    super(message);
    this.name = "RelationshipError";
  }
}

const isId = (id) => typeof id === "string" && id !== "";

function clamp(value) {
  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, value));
}

/**
 * @param {import('./schema.js').Universe} universe
 * @param {string} fromId
 * @param {string} toId
 * @returns {import('./schema.js').Relationship | undefined}
 */
export function getRelationship(universe, fromId, toId) {
  return universe.relationships.find((r) => r.fromId === fromId && r.toId === toId);
}

/**
 * Outgoing relationships of a wrestler, including those with former wrestlers.
 * @param {import('./schema.js').Universe} universe
 * @param {string} id
 */
export function listFor(universe, id) {
  return universe.relationships.filter((r) => r.fromId === id);
}

/**
 * @param {import('./schema.js').Universe} universe
 * @param {string} id
 * @returns {{name: string, former: boolean}}
 */
export function nameOf(universe, id) {
  const current = universe.wrestlers.find((w) => w.id === id);
  if (current) return { name: current.name, former: false };
  const former = universe.formerWrestlers?.[id];
  if (typeof former === "string") return { name: former, former: true };
  return { name: "Unknown wrestler", former: true };
}

function checkWrestler(universe, id, label) {
  if (!isId(id)) throw new RelationshipError(`Choose the ${label} wrestler.`);
  if (universe.wrestlers.some((w) => w.id === id)) return;
  if (universe.formerWrestlers && Object.hasOwn(universe.formerWrestlers, id)) {
    throw new RelationshipError(
      `${nameOf(universe, id).name} has been removed from the roster, so their relationships can no longer change.`,
    );
  }
  throw new RelationshipError(`The ${label} wrestler is not in the universe.`);
}

function validate(universe, { fromId, toId, delta, source }) {
  checkWrestler(universe, fromId, "first");
  checkWrestler(universe, toId, "second");
  if (fromId === toId) throw new RelationshipError("A wrestler cannot have a relationship with themselves.");
  if (!Number.isInteger(delta)) throw new RelationshipError("The change must be a whole number.");
  if (source === null || typeof source !== "object") {
    throw new RelationshipError("Give a reason for the change.");
  }
  if (typeof source.reason !== "string" || source.reason.trim() === "") {
    throw new RelationshipError("Give a reason for the change.");
  }
  if (!Number.isInteger(source.week)) {
    throw new RelationshipError("The week of the change must be a whole number.");
  }
}

function change(relationships, fromId, toId, delta, source) {
  const old = relationships.find((r) => r.fromId === fromId && r.toId === toId);
  const score = clamp((old?.score ?? 0) + delta);
  const entry = {
    id: newId("h"),
    ...(source.eventId !== undefined && { eventId: source.eventId }),
    ...(source.matchId !== undefined && { matchId: source.matchId }),
    week: source.week,
    delta,
    scoreAfter: score,
    participantIds: [...(source.participantIds ?? [fromId, toId])],
    reason: source.reason.trim(),
  };
  const next = {
    fromId,
    toId,
    score,
    state: stateOf(score),
    history: [...(old?.history ?? []), entry],
  };
  return old
    ? relationships.map((r) => (r === old ? next : r))
    : [...relationships, next];
}

/**
 * Applies a score change A→B (and B→A when `mutual`) and records why.
 * Pure: returns a new universe; throws RelationshipError on invalid input.
 * A delta of 0 returns the universe unchanged.
 * @param {import('./schema.js').Universe} universe
 * @param {{fromId: string, toId: string, delta: number, mutual?: boolean,
 *   source: {eventId?: string, matchId?: string, week: number, participantIds?: string[], reason: string}}} input
 * @returns {import('./schema.js').Universe}
 */
export function applyDelta(universe, input) {
  validate(universe, input);
  const { fromId, toId, delta, mutual = false, source } = input;
  if (delta === 0) return universe;
  let relationships = change(universe.relationships, fromId, toId, delta, source);
  if (mutual) relationships = change(relationships, toId, fromId, delta, source);
  return { ...universe, relationships };
}
