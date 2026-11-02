import wrestlersData from "../data/wrestlers.json";
import { STATUSES } from "./constants.js";
import { V2_KEY, SCHEMA_VERSION, createEmptyUniverse, newId, validateUniverse } from "./schema.js";

export const LEGACY_ROSTER_KEY = "wrestlers";
export const LEGACY_WEEK_KEY = "currentWeek";
export const BACKUP_SUFFIX = ".backup-v1";
export const INVALID_BACKUP_KEY = `${V2_KEY}.invalid-backup`;

const STORAGE_NOTICE = "Storage unavailable — changes won't be saved.";
const KNOWN_LEGACY_FIELDS = ["name", "wins", "note", "status", "champion"];

function weekFrom(rawWeek) {
  const week = Number(rawWeek);
  return Number.isInteger(week) && week >= 1 ? week : 1;
}

function convertWrestler(entry) {
  const wrestler = {
    id: newId("w"),
    name: entry.name,
    status: STATUSES.includes(entry.status) ? entry.status : "available",
    wins: Number.isInteger(entry.wins) && entry.wins >= 0 ? entry.wins : 0,
    champion: entry.champion === true,
    notes: typeof entry.note === "string" ? entry.note : "",
  };
  const legacy = {};
  for (const key of Object.keys(entry)) {
    if (!KNOWN_LEGACY_FIELDS.includes(key)) legacy[key] = entry[key];
  }
  if (entry.status !== undefined && wrestler.status !== entry.status) legacy.status = entry.status;
  if (Object.keys(legacy).length > 0) wrestler.legacy = legacy;
  return wrestler;
}

/**
 * Pure conversion of the legacy roster/week strings to a Universe. Never throws.
 * @param {string|null} rawRoster raw localStorage text of the legacy `wrestlers` key
 * @param {string|null} rawWeek raw localStorage text of the legacy `currentWeek` key
 * @returns {{universe: import("./schema.js").Universe, notice?: string}}
 */
export function migrateLegacy(rawRoster, rawWeek) {
  const universe = createEmptyUniverse();
  universe.week = weekFrom(rawWeek);

  let parsed;
  try {
    parsed = JSON.parse(rawRoster);
  } catch {
    parsed = null;
  }
  if (!Array.isArray(parsed)) {
    return {
      universe,
      notice:
        "Your previous roster could not be read, so you are starting with an empty roster. " +
        `The original data was kept in a backup (${LEGACY_ROSTER_KEY}${BACKUP_SUFFIX}).`,
    };
  }

  let skipped = 0;
  for (const entry of parsed) {
    if (entry !== null && typeof entry === "object" && typeof entry.name === "string") {
      universe.wrestlers.push(convertWrestler(entry));
    } else {
      skipped += 1;
    }
  }
  return skipped > 0
    ? {
        universe,
        notice: `${skipped} entr${skipped === 1 ? "y" : "ies"} in your previous roster had no name and could not be carried over.`,
      }
    : { universe };
}

function seedUniverse() {
  const universe = createEmptyUniverse();
  universe.wrestlers = wrestlersData.map((w) => ({
    id: newId("w"),
    name: w.name,
    status: w.note === "*" ? "used" : "available",
    wins: w.wins,
    champion: false,
    notes: w.note,
  }));
  return universe;
}

function setIfAbsent(storage, key, value) {
  if (storage.getItem(key) === null) storage.setItem(key, value);
}

// Returns why a stored v2 document cannot be used, or null when it is valid.
function invalidReason(raw) {
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch {
    return "it is not valid data";
  }
  if (doc !== null && typeof doc === "object" && Number.isInteger(doc.schemaVersion) && doc.schemaVersion > SCHEMA_VERSION) {
    return "it was saved by a newer version of the app";
  }
  return validateUniverse(doc).length === 0 ? null : "it is damaged";
}

/**
 * Makes sure a current (schema v2) Universe is available. Legacy keys are never modified.
 * Never throws: storage failures come back as a notice.
 * @param {{getItem(key: string): string|null, setItem(key: string, value: string): void}} storage
 * @returns {{universe: import("./schema.js").Universe, notice?: string, readOnly?: boolean}}
 */
export function ensureCurrent(storage) {
  let raw;
  let rosterRaw = null;
  let weekRaw = null;
  try {
    raw = storage.getItem(V2_KEY);
    if (raw === null) {
      rosterRaw = storage.getItem(LEGACY_ROSTER_KEY);
      weekRaw = storage.getItem(LEGACY_WEEK_KEY);
    }
  } catch {
    return { universe: seedUniverse(), notice: STORAGE_NOTICE };
  }

  if (raw !== null) {
    const reason = invalidReason(raw);
    if (reason === null) return { universe: JSON.parse(raw) };
    let notice =
      `Your saved universe could not be loaded because ${reason}. It was left untouched ` +
      `(a backup copy is kept in ${INVALID_BACKUP_KEY}) and changes won't be saved until you fix or reset it.`;
    try {
      setIfAbsent(storage, INVALID_BACKUP_KEY, raw);
    } catch {
      notice = `${notice} ${STORAGE_NOTICE}`;
    }
    return { universe: createEmptyUniverse(), notice, readOnly: true };
  }

  const result = rosterRaw === null ? { universe: seedUniverse() } : migrateLegacy(rosterRaw, weekRaw);
  try {
    if (rosterRaw !== null) {
      setIfAbsent(storage, `${LEGACY_ROSTER_KEY}${BACKUP_SUFFIX}`, rosterRaw);
      if (weekRaw !== null) setIfAbsent(storage, `${LEGACY_WEEK_KEY}${BACKUP_SUFFIX}`, weekRaw);
    }
    storage.setItem(V2_KEY, JSON.stringify(result.universe));
  } catch {
    result.notice = result.notice ? `${result.notice} ${STORAGE_NOTICE}` : STORAGE_NOTICE;
  }
  return result;
}
