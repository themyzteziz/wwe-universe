import { DEFAULT_SETTINGS, STATUSES } from "./constants.js";
import { migrateLegacy } from "./migrate.js";
import { SCHEMA_VERSION, V2_KEY, validateUniverse } from "./schema.js";

export const PRE_IMPORT_KEY = `${V2_KEY}.pre-import`;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const FILE_TOO_LARGE = "File too large: backups can be up to 5 MB.";

const UNIVERSE_KEYS = [
  "schemaVersion",
  "week",
  "wrestlers",
  "matchResults",
  "events",
  "relationships",
  "factions",
  "storylines",
  "settings",
  "formerWrestlers",
];
const MATCH_TYPES = ["1v1", "3MAN ELI", "4MAN ELI"];
const EVENT_STATES = ["proposed", "accepted", "rejected"];

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value) => typeof value === "string" && value !== "";
const isWeek = (value) => Number.isInteger(value) && value >= 1;

/** @param {Date} now */
export function exportFilename(now = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `wwe-universe-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/**
 * Serialises the Universe for download. AI settings are never written to a file.
 * @param {import("./schema.js").Universe} universe
 * @param {Date} [now]
 * @returns {{filename: string, text: string}}
 */
export function serializeUniverse(universe, now = new Date()) {
  const settings = { ...universe.settings };
  delete settings.aiEnabled;
  delete settings.aiEndpoint;

  const doc = { ...universe, settings, schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString() };
  if (Object.keys(doc.formerWrestlers ?? {}).length === 0) delete doc.formerWrestlers;

  return { filename: exportFilename(now), text: JSON.stringify(doc, null, 2) };
}

// Fills missing settings from the defaults and forces AI off: a file can never switch on
// AI or point the app at an endpoint.
function importedSettings(settings) {
  if (!isObject(settings)) return settings;

  const merged = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (Object.hasOwn(settings, key)) merged[key] = settings[key];
  }

  return { ...merged, aiEnabled: false, aiEndpoint: "" };
}

// Shape checks on top of validateUniverse, so an imported file cannot crash the views.
function structureProblems(universe) {
  const errors = [];
  const rules = {
    wrestlers: [
      "Wrestler",
      (w) => [
        [isText(w.name), "needs a name"],
        [STATUSES.includes(w.status), `has an invalid status ${JSON.stringify(w.status)}`],
        [Number.isInteger(w.wins) && w.wins >= 0, "needs wins as a whole number of 0 or more"],
        [typeof w.champion === "boolean", "needs champion to be true or false"],
        [typeof w.notes === "string", "needs notes as text"],
      ],
    ],
    matchResults: [
      "Match result",
      (m) => [
        [MATCH_TYPES.includes(m.type), `has an invalid type ${JSON.stringify(m.type)}`],
        [isWeek(m.week), "needs a week of 1 or more"],
      ],
    ],
    events: [
      "Event",
      (e) => [
        [isText(e.type), "needs a type"],
        [EVENT_STATES.includes(e.state), `has an invalid state ${JSON.stringify(e.state)}`],
        [isWeek(e.week), "needs a week of 1 or more"],
        [e.description === undefined || typeof e.description === "string", "needs description as text"],
      ],
    ],
    relationships: ["Relationship", (r) => [[Array.isArray(r.history), "needs a history list"]]],
    factions: ["Faction", (f) => [[isText(f.name), "needs a name"]]],
    storylines: ["Storyline", (s) => [[isText(s.title), "needs a title"]]],
  };

  for (const [key, [label, check]] of Object.entries(rules)) {
    if (!Array.isArray(universe[key])) continue;

    const ids = new Set();
    universe[key].forEach((item, index) => {
      const name = `${label} ${index + 1}`;
      if (!isObject(item)) {
        errors.push(`${name} must be an object.`);
        return;
      }
      // validateUniverse already reports wrestler ids; relationships have no id.
      if (key !== "wrestlers" && key !== "relationships") {
        if (!isText(item.id)) errors.push(`${name} has a missing id.`);
        else if (ids.has(item.id)) errors.push(`Duplicate ${label.toLowerCase()} id "${item.id}".`);
        ids.add(item.id);
      }
      for (const [ok, problem] of check(item)) {
        if (!ok) errors.push(`${name} ${problem}.`);
      }
    });
  }

  if (isObject(universe.formerWrestlers)) {
    for (const [id, name] of Object.entries(universe.formerWrestlers)) {
      if (typeof name !== "string") errors.push(`Former wrestler ${JSON.stringify(id)} needs a name.`);
    }
  }

  return errors;
}

/**
 * Parses and validates a backup file. Pure: nothing is stored. Collects every problem.
 * The only older format is the legacy roster (a JSON array); every file with a
 * schemaVersion below the current one is refused because no earlier versions exist.
 * @param {string} text
 * @returns {{universe: import("./schema.js").Universe, notice?: string} | {errors: string[]}}
 */
export function parseImport(text) {
  if (typeof text !== "string" || text.length > MAX_IMPORT_BYTES) {
    return { errors: [FILE_TOO_LARGE] };
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { errors: ["File is not valid JSON."] };
  }

  let universe;
  let notice;
  if (Array.isArray(data)) {
    ({ universe, notice } = migrateLegacy(text, null));
  } else if (!isObject(data) || !Number.isInteger(data.schemaVersion)) {
    return { errors: ["File is not a Universe backup: it has no schema version."] };
  } else if (data.schemaVersion > SCHEMA_VERSION) {
    return {
      errors: [
        `File was made by a newer version of the app (schema version ${data.schemaVersion}). Update the app and try again.`,
      ],
    };
  } else if (data.schemaVersion < SCHEMA_VERSION) {
    return {
      errors: [`File uses schema version ${data.schemaVersion}, which can no longer be upgraded.`],
    };
  } else {
    // Dropping unknown keys also drops `exportedAt`.
    universe = Object.fromEntries(
      UNIVERSE_KEYS.filter((key) => Object.hasOwn(data, key)).map((key) => [key, data[key]]),
    );
    universe.formerWrestlers ??= {};
  }

  universe.settings = importedSettings(universe.settings);

  const errors = [...validateUniverse(universe), ...structureProblems(universe)];
  if (errors.length > 0) return { errors };

  return notice ? { universe, notice } : { universe };
}

/**
 * Keeps the current stored document in the pre-import slot (overwriting the previous one),
 * after flushing the pending debounced save. In read-only mode pass no `flush`: the raw
 * unreadable document is what gets kept. Never throws.
 * @param {{getItem(key: string): string|null, setItem(key: string, value: string): void}} storage
 * @param {(() => void)|null} flush
 * @returns {{ok: boolean, error?: unknown}}
 */
export function applyImport(storage, flush) {
  try {
    flush?.();
    const raw = storage.getItem(V2_KEY);
    if (raw !== null) storage.setItem(PRE_IMPORT_KEY, raw);
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}
