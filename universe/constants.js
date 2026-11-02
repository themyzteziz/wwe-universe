// Leaf module: imports nothing. Shared thresholds, vocabularies and settings validation.

export const SCORE_MIN = -100;
export const SCORE_MAX = 100;
export const ENEMY_MAX = -60;
export const RIVAL_MAX = -20;
export const ALLY_MIN = 20;

/**
 * @param {number} score integer -100..100
 * @returns {'enemy'|'rival'|'neutral'|'ally'}
 */
export function stateOf(score) {
  if (score <= ENEMY_MAX) return "enemy";
  if (score <= RIVAL_MAX) return "rival";
  if (score >= ALLY_MIN) return "ally";
  return "neutral";
}

export const STATUSES = ["available", "title-shot", "used"];

export const EVENT_TYPE_NAMES = [
  "ambush",
  "save",
  "confrontation",
  "interference",
  "respect",
  "betrayal",
  "faction",
  "return",
];
export const RIVAL_TYPES = ["ambush", "confrontation", "betrayal", "interference"];
export const RESOLVE_TYPES = ["respect", "faction"];

export const DEFAULT_SETTINGS = {
  eventFrequency: 25,
  chaos: 50,
  historySensitivity: 50,
  autoPropose: true,
  seed: null,
  aiEnabled: false,
  aiEndpoint: "",
};

const SLIDERS = ["eventFrequency", "chaos", "historySensitivity"];
const BOOLEANS = ["autoPropose", "aiEnabled"];

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validates a (partial) settings object. Unknown keys are ignored.
 * Never throws. `value` is DEFAULT_SETTINGS merged with the valid input
 * (only meaningful when `ok` is true).
 * @param {unknown} partial
 * @returns {{ok: boolean, errors: string[], value: typeof DEFAULT_SETTINGS}}
 */
export function validateSettings(partial) {
  const errors = [];
  if (partial === null || typeof partial !== "object" || Array.isArray(partial)) {
    return {
      ok: false,
      errors: ["Settings must be an object."],
      value: { ...DEFAULT_SETTINGS },
    };
  }
  const value = { ...DEFAULT_SETTINGS, ...partial };

  for (const key of SLIDERS) {
    const v = value[key];
    if (!Number.isInteger(v) || v < 0 || v > 100) {
      errors.push(`Setting "${key}" must be a whole number from 0 to 100.`);
    }
  }
  for (const key of BOOLEANS) {
    if (typeof value[key] !== "boolean") {
      errors.push(`Setting "${key}" must be true or false.`);
    }
  }
  const seed = value.seed;
  if (seed !== null && !(Number.isSafeInteger(seed) && seed >= 0)) {
    errors.push('Setting "seed" must be a whole number of 0 or more, or empty.');
  }
  const endpoint = value.aiEndpoint;
  if (endpoint !== "" && !(typeof endpoint === "string" && isHttpsUrl(endpoint))) {
    errors.push('Setting "aiEndpoint" must be empty or a valid https:// address.');
  }

  return { ok: errors.length === 0, errors, value };
}
