import { RESOLVE_TYPES, RIVAL_TYPES } from "./constants.js";
import { nameOf } from "./relationships.js";
import { newId } from "./schema.js";

export const ABANDON_AFTER_WEEKS = 8;

const hasPair = (storyline, a, b) =>
  storyline.participantIds.includes(a) && storyline.participantIds.includes(b);

function withEventLinked(events, eventId, storylineId) {
  return events.map((e) => (e.id === eventId ? { ...e, storylineId } : e));
}

/**
 * Groups an accepted event into a storyline. Pure: returns a new universe, or the
 * same universe when nothing applies (event not accepted, already attached, fewer
 * than 2 participants, or a non-rival event with no open storyline for the pair).
 * @param {import('./schema.js').Universe} universe
 * @param {import('./schema.js').SimEvent} event
 * @returns {import('./schema.js').Universe}
 */
export function attachEvent(universe, event) {
  if (!event || event.state !== "accepted") return universe;
  if (!Array.isArray(event.participantIds) || event.participantIds.length < 2) return universe;
  if (universe.storylines.some((s) => s.eventIds.includes(event.id))) return universe;

  const [a, b] = event.participantIds;
  const open = universe.storylines.find((s) => s.status === "open" && hasPair(s, a, b));

  if (open) {
    const hasRivalEvent = [...open.eventIds, event.id].some((id) => {
      const type = id === event.id ? event.type : universe.events.find((e) => e.id === id)?.type;
      return RIVAL_TYPES.includes(type);
    });
    const resolves = RESOLVE_TYPES.includes(event.type) && hasRivalEvent;
    const updated = {
      ...open,
      eventIds: [...open.eventIds, event.id],
      participantIds: [...new Set([...open.participantIds, ...event.participantIds])],
      lastWeek: event.week,
      ...(resolves && { status: "resolved", resolvedWeek: event.week }),
    };
    return {
      ...universe,
      storylines: universe.storylines.map((s) => (s === open ? updated : s)),
      events: withEventLinked(universe.events, event.id, open.id),
    };
  }

  if (!RIVAL_TYPES.includes(event.type)) return universe;

  const storyline = {
    id: newId("s"),
    title: `${nameOf(universe, a).name} vs ${nameOf(universe, b).name}`,
    participantIds: [...event.participantIds],
    eventIds: [event.id],
    status: "open",
    openedWeek: event.week,
    lastWeek: event.week,
  };
  return {
    ...universe,
    storylines: [...universe.storylines, storyline],
    events: withEventLinked(universe.events, event.id, storyline.id),
  };
}

/**
 * Marks open storylines with no events for ABANDON_AFTER_WEEKS or more as abandoned.
 * Pure and idempotent: returns the same universe when nothing changes.
 * @param {import('./schema.js').Universe} universe
 * @param {number} week current week
 * @returns {import('./schema.js').Universe}
 */
export function evaluateStatuses(universe, week) {
  const stale = (s) => s.status === "open" && week - s.lastWeek >= ABANDON_AFTER_WEEKS;
  if (!universe.storylines.some(stale)) return universe;
  return {
    ...universe,
    storylines: universe.storylines.map((s) =>
      stale(s) ? { ...s, status: "abandoned", resolvedWeek: week } : s,
    ),
  };
}
