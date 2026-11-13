import { SCHEMA_VERSION } from "./schema.js";

const pad = (n) => String(n).padStart(2, "0");

/**
 * @param {Date} now
 * @returns {string} `wwe-universe-YYYY-MM-DD.json` using the local date
 */
export function exportFilename(now = new Date()) {
  return `wwe-universe-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

// Shared files must never carry an AI endpoint.
function withoutAi(settings) {
  const rest = { ...settings };
  delete rest.aiEnabled;
  delete rest.aiEndpoint;
  return rest;
}

/**
 * Serialises the in-memory universe for download.
 * @param {import("./schema.js").Universe} universe
 * @param {Date} [now]
 * @returns {{filename: string, text: string}}
 */
export function serializeUniverse(universe, now = new Date()) {
  const document = {
    ...universe,
    settings: withoutAi(universe.settings),
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
  };

  if (Object.keys(document.formerWrestlers ?? {}).length === 0) {
    delete document.formerWrestlers;
  }

  return { filename: exportFilename(now), text: JSON.stringify(document, null, 2) };
}
