// Storage helpers for the continuity acceptance tests (US-130).
import { vi } from "vitest";

/** In-memory `Storage` so a scenario never touches the jsdom localStorage. */
export function createMemoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));

  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    clear: () => data.clear(),
    key: (index) => [...data.keys()][index] ?? null,
    get length() {
      return data.size;
    },
  };
}

/** Replaces `localStorage` with a fresh in-memory store; undo with `vi.unstubAllGlobals()`. */
export function stubStorage(initial) {
  const storage = createMemoryStorage(initial);
  vi.stubGlobal("localStorage", storage);

  return storage;
}
