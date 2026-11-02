import { nameOf } from "./relationships.js";

/**
 * @typedef {Object} TimelineEntry
 * @property {'match'|'event'} kind
 * @property {string} id
 * @property {number} week
 * @property {string} createdAt
 * @property {string[]} participantIds
 * @property {string} type          match type or event type
 * @property {string} [state]       events only
 * @property {string} description
 * @property {boolean} dimmed       true for rejected events
 */

function matchLine(universe, match) {
  const names = (ids) => ids.map((id) => nameOf(universe, id).name).join(" & ");
  const losers = match.participantIds.filter((id) => !match.winnerIds.includes(id));

  return `${names(match.winnerIds)} def. ${names(losers)}`.trim();
}

/**
 * Chronological feed of match results and accepted (optionally rejected) events.
 * Proposed events are never included. Pure; never mutates the universe.
 * @param {import('./schema.js').Universe} universe
 * @param {{order?: 'desc'|'asc', weekFrom?: number, weekTo?: number, wrestlerId?: string,
 *   eventType?: string, states?: Set<string>, showRejected?: boolean}} [filters]
 * @returns {TimelineEntry[]}
 */
export function timelineEntries(universe, filters = {}) {
  const { order = "desc", weekFrom, weekTo, wrestlerId, eventType, states, showRejected = false } =
    filters;

  const matches = eventType
    ? []
    : universe.matchResults.map((m) => ({
        kind: "match",
        id: m.id,
        week: m.week,
        createdAt: m.recordedAt,
        participantIds: m.participantIds,
        type: m.type,
        description: matchLine(universe, m),
        dimmed: false,
      }));

  const events = universe.events
    .filter(
      (e) =>
        e.state === "accepted" ||
        (showRejected && e.state === "rejected"),
    )
    .filter((e) => !states || states.size === 0 || states.has(e.state))
    .filter((e) => !eventType || e.type === eventType)
    .map((e) => ({
      kind: "event",
      id: e.id,
      week: e.week,
      createdAt: e.createdAt,
      participantIds: e.participantIds,
      type: e.type,
      state: e.state,
      description: e.description ?? "",
      dimmed: e.state === "rejected",
    }));

  const entries = [...matches, ...events].filter(
    (e) =>
      (weekFrom === undefined || e.week >= weekFrom) &&
      (weekTo === undefined || e.week <= weekTo) &&
      (!wrestlerId || e.participantIds.includes(wrestlerId)),
  );

  const compare = (a, b) =>
    a.week - b.week ||
    String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")) ||
    a.id.localeCompare(b.id);

  entries.sort(compare);

  return order === "asc" ? entries : entries.reverse();
}
