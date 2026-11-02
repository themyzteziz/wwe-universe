// Pure faction rules: state in -> result out. No React, no storage, no title/champion changes.
// Every function returns { ok: true, universe, faction? } or { ok: false, error }; on error
// the caller keeps its universe unchanged.

import { ALLY_MIN } from "./constants.js";
import { newId } from "./schema.js";

export const MIN_MEMBERS = 2;
export const MAX_MEMBERS = 5;
export const FORM_THRESHOLD = ALLY_MIN;
export const DISSOLVE_THRESHOLD = 0;
export const NAME_MAX = 40;

// Edit these lists to change the generated faction names.
export const WORDS_A = [
  "Iron",
  "Crimson",
  "Shadow",
  "Savage",
  "Royal",
  "Rogue",
  "Black",
  "Golden",
  "Steel",
  "Wild",
];
export const WORDS_B = [
  "Syndicate",
  "Order",
  "Alliance",
  "Brotherhood",
  "Collective",
  "Legion",
  "Dynasty",
  "Cartel",
  "Union",
  "Pack",
];

const NAME_RETRIES = 10;

const fail = (error) => ({ ok: false, error });

function scoreOf(universe, fromId, toId) {
  const relationship = universe.relationships.find(
    (r) => r.fromId === fromId && r.toId === toId,
  );
  return relationship ? relationship.score : 0;
}

function cleanName(name) {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (trimmed === "" || trimmed.length > NAME_MAX) {
    return { error: `A faction name must be 1 to ${NAME_MAX} characters.` };
  }
  return { name: trimmed };
}

/**
 * Picks a name from the word lists using only the injected seeded rng. Retries up to
 * 10 times to avoid the name of an active faction, then appends a number.
 * @param {{pick: Function}} rng
 * @param {string[]} [takenNames] names of active factions to avoid
 * @returns {string}
 */
export function generateName(rng, takenNames = []) {
  const taken = new Set(takenNames.map((n) => n.toLowerCase()));
  let name = "";
  for (let attempt = 0; attempt <= NAME_RETRIES; attempt += 1) {
    name = `${rng.pick(WORDS_A)} ${rng.pick(WORDS_B)}`;
    if (!taken.has(name.toLowerCase())) return name;
  }
  let n = 2;
  while (taken.has(`${name} ${n}`.toLowerCase())) n += 1;
  return `${name} ${n}`;
}

/**
 * @param {import('./schema.js').Universe} universe
 * @param {string[]} memberIds
 * @returns {{ok: true} | {ok: false, error: string}}
 */
export function canForm(universe, memberIds) {
  if (!Array.isArray(memberIds)) return fail("Choose the wrestlers who will form the faction.");
  if (new Set(memberIds).size !== memberIds.length) {
    return fail("A wrestler can only be listed once in a faction.");
  }
  if (memberIds.length < MIN_MEMBERS || memberIds.length > MAX_MEMBERS) {
    return fail(`A faction needs ${MIN_MEMBERS} to ${MAX_MEMBERS} wrestlers.`);
  }
  const byId = new Map(universe.wrestlers.map((w) => [w.id, w]));
  if (memberIds.some((id) => !byId.has(id))) {
    return fail("Every founder must be a wrestler on the current roster.");
  }
  for (const faction of universe.factions) {
    if (!faction.active) continue;
    const clash = memberIds.find((id) => faction.memberIds.includes(id));
    if (clash) {
      return fail(`${byId.get(clash).name} is already in the faction "${faction.name}".`);
    }
  }
  for (const a of memberIds) {
    for (const b of memberIds) {
      if (a === b) continue;
      const score = scoreOf(universe, a, b);
      if (score < FORM_THRESHOLD) {
        return fail(
          `${byId.get(a).name} must feel at least ${FORM_THRESHOLD} towards ${byId.get(b).name} (currently ${score}); every pair needs this in both directions.`,
        );
      }
    }
  }
  return { ok: true };
}

/**
 * @param {import('./schema.js').Universe} universe
 * @param {string[]} memberIds
 * @param {string} eventId accepted event that formed the faction
 * @param {{pick: Function}} rng seeded rng from sim/rng.js
 * @param {string} [name] optional player-chosen name
 */
export function formFaction(universe, memberIds, eventId, rng, name) {
  const eligible = canForm(universe, memberIds);
  if (!eligible.ok) return eligible;
  if (typeof eventId !== "string" || eventId === "") {
    return fail("A faction can only form from an accepted event.");
  }
  let finalName;
  if (name === undefined) {
    finalName = generateName(
      rng,
      universe.factions.filter((f) => f.active).map((f) => f.name),
    );
  } else {
    const cleaned = cleanName(name);
    if (cleaned.error) return fail(cleaned.error);
    finalName = cleaned.name;
  }
  const faction = {
    id: newId("f"),
    name: finalName,
    memberIds: [...memberIds],
    formedEventId: eventId,
    formedWeek: universe.week,
    active: true,
  };
  return { ok: true, universe: { ...universe, factions: [...universe.factions, faction] }, faction };
}

/** Mean of all ordered-pair scores between members (missing relationship = 0). */
export function avgInternalScore(universe, faction) {
  let total = 0;
  let pairs = 0;
  for (const a of faction.memberIds) {
    for (const b of faction.memberIds) {
      if (a === b) continue;
      total += scoreOf(universe, a, b);
      pairs += 1;
    }
  }
  return pairs === 0 ? 0 : total / pairs;
}

/** Active factions whose average internal score is strictly below 0. Never dissolved automatically. */
export function dissolutionCandidates(universe) {
  return universe.factions.filter(
    (f) => f.active && avgInternalScore(universe, f) < DISSOLVE_THRESHOLD,
  );
}

function replaceFaction(universe, faction) {
  return {
    ...universe,
    factions: universe.factions.map((f) => (f.id === faction.id ? faction : f)),
  };
}

export function dissolveFaction(universe, factionId, eventId) {
  const faction = universe.factions.find((f) => f.id === factionId);
  if (!faction) return fail("That faction no longer exists.");
  if (!faction.active) return fail(`The faction "${faction.name}" has already broken up.`);
  const dissolved = { ...faction, active: false, dissolvedWeek: universe.week };
  if (typeof eventId === "string" && eventId !== "") dissolved.dissolvedEventId = eventId;
  return { ok: true, universe: replaceFaction(universe, dissolved), faction: dissolved };
}

export function renameFaction(universe, factionId, name) {
  const faction = universe.factions.find((f) => f.id === factionId);
  if (!faction) return fail("That faction no longer exists.");
  const cleaned = cleanName(name);
  if (cleaned.error) return fail(cleaned.error);
  const renamed = { ...faction, name: cleaned.name };
  return { ok: true, universe: replaceFaction(universe, renamed), faction: renamed };
}
