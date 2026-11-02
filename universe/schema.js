import {
  DEFAULT_SETTINGS,
  SCORE_MAX,
  SCORE_MIN,
  stateOf,
  validateSettings,
} from "./constants.js";

/**
 * @typedef {Object} Wrestler
 * @property {string} id            "w_" + UUID, never derived from the name
 * @property {string} name
 * @property {'available'|'title-shot'|'used'} status
 * @property {number} wins          integer >= 0
 * @property {boolean} champion
 * @property {string} notes         plain string; the only place notes live
 * @property {Object} [legacy]
 *
 * @typedef {Object} MatchResult
 * @property {string} id            "m_..."
 * @property {number} week
 * @property {'1v1'|'3MAN ELI'|'4MAN ELI'} type
 * @property {string[]} participantIds
 * @property {string[]} winnerIds
 * @property {string} recordedAt    ISO string
 * @property {number} [seed]
 *
 * @typedef {Object} SimEvent
 * @property {string} id            "e_..."
 * @property {string} type
 * @property {number} week
 * @property {string[]} participantIds
 * @property {'proposed'|'accepted'|'rejected'} state
 * @property {number} seed
 * @property {Object[]} deltas
 * @property {string} description
 * @property {string} [storylineId]
 * @property {string} [matchId]
 * @property {number} [rerollCount]
 * @property {Object[]} [suggestions]  title-shot suggestions, applied only on player confirmation
 * @property {string} createdAt     ISO string
 *
 * @typedef {Object} Relationship
 * @property {string} fromId
 * @property {string} toId
 * @property {number} score         integer -100..100
 * @property {string} state
 * @property {Object[]} history
 *
 * @typedef {Object} Faction
 * @property {string} id            "f_..."
 * @property {string} name
 * @property {string[]} memberIds
 * @property {string} formedEventId
 * @property {boolean} active
 *
 * @typedef {Object} Storyline
 * @property {string} id            "s_..."
 * @property {string} title
 * @property {string[]} participantIds
 * @property {string[]} eventIds
 * @property {string} status
 *
 * @typedef {Object} Universe
 * @property {2} schemaVersion
 * @property {number} week
 * @property {Wrestler[]} wrestlers
 * @property {MatchResult[]} matchResults
 * @property {SimEvent[]} events
 * @property {Relationship[]} relationships
 * @property {Faction[]} factions
 * @property {Storyline[]} storylines
 * @property {typeof DEFAULT_SETTINGS} settings
 * @property {Object<string,string>} [formerWrestlers]  id -> name of removed wrestlers
 */

export const SCHEMA_VERSION = 2;
export const V2_KEY = "wwe-universe-v2";

const ARRAY_KEYS = [
  "wrestlers",
  "matchResults",
  "events",
  "relationships",
  "factions",
  "storylines",
];

/**
 * @param {string} prefix e.g. 'w', 'm', 'e', 'f', 's'
 * @returns {string}
 */
export function newId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

/**
 * @returns {Universe}
 */
export function createEmptyUniverse() {
  return {
    schemaVersion: SCHEMA_VERSION,
    week: 1,
    wrestlers: [],
    matchResults: [],
    events: [],
    relationships: [],
    factions: [],
    storylines: [],
    settings: { ...DEFAULT_SETTINGS, seed: Math.floor(Math.random() * 2 ** 31) },
    formerWrestlers: {},
  };
}

function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * Returns a list of plain-text problems; an empty list means the document is valid.
 * Collects every error and never throws.
 * @param {unknown} obj
 * @returns {string[]}
 */
export function validateUniverse(obj) {
  const errors = [];
  if (!isObject(obj)) return ["Universe data must be an object."];

  if (obj.schemaVersion !== SCHEMA_VERSION) {
    errors.push(
      `schemaVersion must be ${SCHEMA_VERSION} but was ${JSON.stringify(obj.schemaVersion)}.`,
    );
  }
  if (typeof obj.week !== "number" || !Number.isInteger(obj.week) || obj.week < 1) {
    errors.push("week must be a whole number of 1 or more.");
  }
  for (const key of ARRAY_KEYS) {
    if (!Array.isArray(obj[key])) errors.push(`"${key}" must be an array.`);
  }

  if (!isObject(obj.settings)) {
    errors.push("settings must be an object.");
  } else {
    errors.push(...validateSettings(obj.settings).errors);
  }

  const list = (key) => (Array.isArray(obj[key]) ? obj[key].filter(isObject) : []);

  const known = new Set();
  const seen = new Set();
  for (const w of list("wrestlers")) {
    if (typeof w.id !== "string" || w.id === "") {
      errors.push("A wrestler has a missing or invalid id.");
      continue;
    }
    if (seen.has(w.id)) errors.push(`Duplicate wrestler id "${w.id}".`);
    seen.add(w.id);
    known.add(w.id);
  }
  if (isObject(obj.formerWrestlers)) {
    for (const id of Object.keys(obj.formerWrestlers)) known.add(id);
  } else if (obj.formerWrestlers !== undefined) {
    errors.push("formerWrestlers must be an object.");
  }

  const checkIds = (label, ids) => {
    if (!Array.isArray(ids)) {
      errors.push(`${label} must be an array of wrestler ids.`);
      return;
    }
    for (const id of ids) {
      if (!known.has(id)) {
        errors.push(`${label} references unknown wrestler id ${JSON.stringify(id)}.`);
      }
    }
  };

  const pairs = new Set();
  list("relationships").forEach((r, i) => {
    const label = `Relationship ${i + 1}`;
    checkIds(`${label} fromId`, [r.fromId]);
    checkIds(`${label} toId`, [r.toId]);
    if (r.fromId === r.toId) errors.push(`${label} cannot be between a wrestler and themselves.`);
    const pair = `${r.fromId}>${r.toId}`;
    if (pairs.has(pair)) errors.push(`${label} duplicates the relationship ${pair}.`);
    pairs.add(pair);
    if (!Number.isInteger(r.score) || r.score < SCORE_MIN || r.score > SCORE_MAX) {
      errors.push(`${label} score must be a whole number from ${SCORE_MIN} to ${SCORE_MAX}.`);
    } else if (r.state !== stateOf(r.score)) {
      errors.push(
        `${label} state ${JSON.stringify(r.state)} does not match its score (expected "${stateOf(r.score)}").`,
      );
    }
  });
  list("events").forEach((e, i) => checkIds(`Event ${i + 1} participantIds`, e.participantIds));
  list("matchResults").forEach((m, i) => {
    checkIds(`Match result ${i + 1} participantIds`, m.participantIds);
    checkIds(`Match result ${i + 1} winnerIds`, m.winnerIds);
  });
  list("factions").forEach((f, i) => checkIds(`Faction ${i + 1} memberIds`, f.memberIds));
  list("storylines").forEach((s, i) =>
    checkIds(`Storyline ${i + 1} participantIds`, s.participantIds),
  );

  const proposed = list("events").filter((e) => e.state === "proposed").length;
  if (proposed > 1) {
    errors.push(`Only one event can be proposed at a time but found ${proposed}.`);
  }

  return errors;
}
