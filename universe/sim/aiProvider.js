// Optional AI description hook (US-136). Sends only already-decided event facts to a
// player-entered HTTPS endpoint and returns text. It never sees or returns deltas and
// never throws: every failure falls back to the template text.

export const AI_TIMEOUT_MS = 10000;
export const AI_MAX_CHARS = 600;
export const AI_NOTICE = "AI text unavailable, using template";

function isUsableEndpoint(endpoint) {
  if (typeof endpoint !== "string" || !/^https:\/\//i.test(endpoint)) return false;

  try {
    new URL(endpoint);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {{type: string, description: string}} event  template description is the fallback
 * @param {{participants: string[], facts: string[]}} facts  names and history clauses only
 * @param {{aiEnabled?: boolean, aiEndpoint?: string}} settings
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{text: string, usedAi: boolean, notice?: string}>}
 */
export async function enhanceDescription(event, facts, settings, fetchImpl = globalThis.fetch) {
  const template = { text: event.description, usedAi: false };

  if (settings?.aiEnabled !== true) return template;

  const fallback = { ...template, notice: AI_NOTICE };

  if (!isUsableEndpoint(settings.aiEndpoint) || typeof fetchImpl !== "function") {
    return fallback;
  }

  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("AI request timed out"));
    }, AI_TIMEOUT_MS);
  });

  try {
    const response = await Promise.race([
      fetchImpl(settings.aiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: event.type,
          participants: facts.participants,
          facts: facts.facts,
        }),
        credentials: "omit",
        mode: "cors",
        signal: controller.signal,
      }),
      timeout,
    ]);

    if (!response.ok) return fallback;

    const data = await Promise.race([response.json(), timeout]);
    const text = typeof data?.text === "string" ? data.text.trim().slice(0, AI_MAX_CHARS) : "";

    return text ? { text, usedAi: true } : fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
