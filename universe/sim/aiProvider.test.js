import { afterEach, describe, expect, it, vi } from "vitest";
import { reducer } from "../UniverseContext.jsx";
import { createEmptyUniverse } from "../schema.js";
import { AI_MAX_CHARS, AI_NOTICE, AI_TIMEOUT_MS, enhanceDescription } from "./aiProvider.js";

const event = {
  type: "ambush",
  description: "Template text.",
  deltas: [{ fromId: "w_1", toId: "w_2", delta: -10 }],
};
const facts = { participants: ["ALPHA", "BETA"], facts: ["Last week they fought."] };
const on = { aiEnabled: true, aiEndpoint: "https://ai.example/describe" };

const okResponse = (body) => ({ ok: true, json: async () => body });

afterEach(() => {
  vi.useRealTimers();
});

describe("enhanceDescription", () => {
  it("AC 1: makes no network call when AI is off, with no notice", async () => {
    const fetchImpl = vi.fn();
    const result = await enhanceDescription(
      event,
      facts,
      { aiEnabled: false, aiEndpoint: on.aiEndpoint },
      fetchImpl
    );

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toEqual({ text: "Template text.", usedAi: false });
  });

  it("AC 2: replaces only the text and leaves the event and its deltas untouched", async () => {
    const before = JSON.parse(JSON.stringify(event));
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ text: "  A richer story. " }));
    const result = await enhanceDescription(event, facts, on, fetchImpl);

    expect(result).toEqual({ text: "A richer story.", usedAi: true });
    expect(event).toEqual(before);
    expect(Object.keys(result)).not.toContain("deltas");
  });

  it("AC 2: sends only type, names and facts, without credentials", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ text: "x" }));
    await enhanceDescription(event, facts, on, fetchImpl);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(on.aiEndpoint);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(init.credentials).toBe("omit");
    expect(init.mode).toBe("cors");
    expect(JSON.parse(init.body)).toEqual({
      type: "ambush",
      participants: ["ALPHA", "BETA"],
      facts: ["Last week they fought."],
    });
  });

  it("AC 2: truncates long text to 600 characters", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ text: "a".repeat(900) }));
    const result = await enhanceDescription(event, facts, on, fetchImpl);

    expect(result.text).toHaveLength(AI_MAX_CHARS);
    expect(result.usedAi).toBe(true);
  });

  it("AC 3: falls back with a notice on HTTP error, network error, bad JSON and wrong shape", async () => {
    const failures = [
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ text: "x" }) }),
      vi.fn().mockRejectedValue(new TypeError("network")),
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError("bad json");
        },
      }),
      vi.fn().mockResolvedValue(okResponse({ text: 42 })),
      vi.fn().mockResolvedValue(okResponse({ text: "   " })),
      vi.fn().mockResolvedValue(okResponse(null)),
    ];

    for (const fetchImpl of failures) {
      await expect(enhanceDescription(event, facts, on, fetchImpl)).resolves.toEqual({
        text: "Template text.",
        usedAi: false,
        notice: AI_NOTICE,
      });
    }
  });

  it("AC 3: gives up after 10 seconds and aborts the request", async () => {
    vi.useFakeTimers();

    let signal;
    const fetchImpl = vi.fn((_url, init) => {
      signal = init.signal;
      return new Promise(() => {});
    });
    const pending = enhanceDescription(event, facts, on, fetchImpl);

    await vi.advanceTimersByTimeAsync(AI_TIMEOUT_MS - 1);
    expect(signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    await expect(pending).resolves.toEqual({
      text: "Template text.",
      usedAi: false,
      notice: AI_NOTICE,
    });
    expect(signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("AC 4: a missing or non-https endpoint never calls fetch and shows the notice", async () => {
    for (const aiEndpoint of ["", "http://ai.example", "ftp://x", "https://", "not a url"]) {
      const fetchImpl = vi.fn();
      const result = await enhanceDescription(event, facts, { aiEnabled: true, aiEndpoint }, fetchImpl);

      expect(fetchImpl).not.toHaveBeenCalled();
      expect(result).toEqual({ text: "Template text.", usedAi: false, notice: AI_NOTICE });
    }
  });
});

describe("settings guards in the reducer", () => {
  const state = (universe) => ({ universe, readOnly: false, notice: null, saveError: null, banners: [] });
  const base = createEmptyUniverse();

  it("AC 4: updateSettings refuses a non-https endpoint and accepts https", () => {
    const start = state(base);

    expect(reducer(start, { type: "updateSettings", settings: { aiEndpoint: "http://ai.example" } })).toBe(start);

    const next = reducer(start, { type: "updateSettings", settings: { aiEnabled: true, aiEndpoint: on.aiEndpoint } });
    expect(next.universe.settings).toMatchObject(on);
    expect(next.universe.settings.eventFrequency).toBe(base.settings.eventFrequency);
  });

  it("AC 4: replaceUniverse refuses a non-https endpoint", () => {
    const start = state(base);
    const hostile = { ...base, settings: { ...base.settings, aiEnabled: true, aiEndpoint: "http://evil.example" } };

    expect(reducer(start, { type: "replaceUniverse", universe: hostile })).toBe(start);
  });

  it("AC 6: an import resets aiEnabled and aiEndpoint, so no request is made afterwards", async () => {
    const imported = { ...base, settings: { ...base.settings, aiEnabled: true, aiEndpoint: on.aiEndpoint } };
    const next = reducer(state(base), { type: "replaceUniverse", universe: imported, confirmed: true });

    expect(next.universe.settings.aiEnabled).toBe(false);
    expect(next.universe.settings.aiEndpoint).toBe("");

    const fetchImpl = vi.fn();
    await enhanceDescription(event, facts, next.universe.settings, fetchImpl);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
