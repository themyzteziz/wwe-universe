// Template-based story text for event proposals (US-127). Pure: no clock, no unseeded
// randomness, no I/O. The text is stored on the Event at creation and never read by the
// engine (eligibility, selection, consequences), so it cannot change any delta.
import { nameOf } from '../relationships.js';
import { EVENT_TYPES } from './config.js';

/**
 * Tokens: {a} {b} {c} {d} = participants by position, {members} = every participant,
 * {others} = every participant except the first, {history} = optional clause (leading space).
 * Neutral fictional prose only.
 */
export const TEMPLATES = {
  confrontation: [
    '{a} squares up to {b} in the middle of the ring.{history}',
    '{a} and {b} trade words that quickly turn into a shoving match.{history}',
    'Tempers flare as {a} calls out {b} in front of the crowd.{history}',
    '{b} refuses to back down when {a} gets in their face.{history}',
  ],
  respect: [
    '{a} and {b} share a handshake after a hard-fought night.{history}',
    '{a} publicly acknowledges {b} as a worthy opponent.{history}',
    'The crowd applauds as {a} raises the hand of {b}.{history}',
    '{b} nods in thanks as {a} pays them an unexpected compliment.{history}',
  ],
  interference: [
    '{a} storms the ring to interfere on behalf of {b}, costing {c} dearly.{history}',
    '{a} distracts the referee so that {b} can gain the upper hand over {c}.{history}',
    '{c} is blindsided by {a}, who is determined to help {b}.{history}',
    'Out of nowhere, {a} slides in and cuts off {c} to protect {b}.{history}',
  ],
  save: [
    '{a} rushes down to save {b} from {c}.{history}',
    '{c} is chased off by {a}, who rescues {b} just in time.{history}',
    '{b} is saved by {a} as {c} closes in for more.{history}',
    '{a} clears the ring of {c} and helps {b} to their feet.{history}',
  ],
  ambush: [
    '{a} ambushes {b} backstage.{history}',
    '{b} is jumped from behind by {a} as the cameras roll.{history}',
    '{a} lies in wait and attacks {b} in the parking lot.{history}',
    'Without warning, {a} blindsides {b} in the hallway.{history}',
  ],
  betrayal: [
    '{a} turns on {b} and walks away without a word.{history}',
    '{b} is stunned as {a} delivers a shocking betrayal.{history}',
    'After standing side by side, {a} abandons {b} in their hour of need.{history}',
    '{a} attacks {b} and leaves them to fend for themselves.{history}',
  ],
  faction: [
    '{members} join forces and announce a new faction.{history}',
    'United by a common goal, {members} stand together as one group.{history}',
    '{members} walk to the ring side by side, a new alliance in the making.{history}',
    'A new group is born as {members} pledge loyalty to each other.{history}',
  ],
  // Catalogued for completeness; the engine never generates a return in v1.
  return: [
    '{a} makes a surprise return and faces {others}.{history}',
    'The crowd erupts as {a} comes back and meets {others}.{history}',
    '{a} is back, and {others} take notice.{history}',
  ],
};

const TOKEN = /\{(a|b|c|d|members|others|history)\}/g;

function joinNames(names) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

function pairsOf(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) out.push([ids[i], ids[j]]);
  }
  return out;
}

/** Most recent match in which exactly one of the pair won. */
function lastDecisiveMatch(state, [x, y]) {
  return [...(state.matchResults ?? [])].reverse().find(
    (m) => m.participantIds.includes(x) && m.participantIds.includes(y)
      && m.winnerIds.includes(x) !== m.winnerIds.includes(y),
  );
}

/** First fact found in state about any pair of participants, as a clause with a leading space. */
function historyClause(event, state) {
  const pairs = pairsOf(event.participantIds);

  for (const pair of pairs) {
    const m = lastDecisiveMatch(state, pair);
    if (!m) continue;
    const [winner, loser] = m.winnerIds.includes(pair[0]) ? pair : [pair[1], pair[0]];
    return ` This follows ${nameOf(state, loser).name}'s loss to ${nameOf(state, winner).name} in week ${m.week}.`;
  }

  for (const [x, y] of pairs) {
    const prior = [...(state.events ?? [])].reverse().find(
      (e) => e.state === 'accepted' && e.id !== event.id
        && e.participantIds.includes(x) && e.participantIds.includes(y),
    );
    if (prior) {
      const label = (EVENT_TYPES[prior.type]?.label ?? 'storyline moment').toLowerCase();
      return ` Their ${label} in week ${prior.week} is not forgotten.`;
    }
  }

  const feud = (state.storylines ?? []).some(
    (s) => s.status === 'open'
      && pairs.some(([x, y]) => s.participantIds.includes(x) && s.participantIds.includes(y)),
  );
  return feud ? ' The feud between them continues.' : '';
}

/**
 * Renders the story text of a proposal from IDs, using only facts present in `state`.
 * Same event + state + rng stream => same text. Never mutates its inputs.
 * @param {{type: string, participantIds: string[], id?: string, week?: number}} event
 * @param {import('../schema.js').Universe} state
 * @param {{pick: <T>(arr: T[]) => T}} rng
 * @returns {string}
 */
export function describeEvent(event, state, rng) {
  const templates = TEMPLATES[event.type];
  const config = EVENT_TYPES[event.type];
  if (!templates || !config) throw new TypeError(`Unknown event type "${event.type}".`);
  if (event.participantIds.length < config.minParticipants) {
    throw new RangeError(`Event type "${event.type}" needs at least ${config.minParticipants} wrestlers.`);
  }

  const names = event.participantIds.map((id) => nameOf(state, id).name);
  const values = {
    a: names[0],
    b: names[1],
    c: names[2],
    d: names[3],
    members: joinNames(names),
    others: joinNames(names.slice(1)),
    history: historyClause(event, state),
  };

  return rng
    .pick(templates)
    .replace(TOKEN, (_, key) => values[key] ?? '')
    .replace(/ {2,}/g, ' ')
    .replace(/ +([.,!?;:])/g, '$1')
    .trim();
}
