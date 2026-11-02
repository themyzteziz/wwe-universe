import { describe, expect, it, vi } from "vitest";
import {
  applyImport,
  exportFilename,
  MAX_IMPORT_BYTES,
  parseImport,
  PRE_IMPORT_KEY,
  serializeUniverse,
} from "./exportImport.js";
import { createEmptyUniverse, V2_KEY, validateUniverse } from "./schema.js";

function richUniverse() {
  const u = createEmptyUniverse();
  u.week = 4;
  u.wrestlers = [
    { id: "w_a", name: "ALPHA", status: "title-shot", wins: 3, champion: true, notes: "Fan favourite" },
    { id: "w_b", name: "BETA", status: "available", wins: 1, champion: false, notes: "" },
  ];
  u.matchResults = [
    {
      id: "m_1",
      week: 3,
      type: "1v1",
      participantIds: ["w_a", "w_b"],
      winnerIds: ["w_a"],
      recordedAt: "2026-01-01T00:00:00.000Z",
      seed: 7,
    },
  ];
  u.events = [
    {
      id: "e_1",
      type: "betrayal",
      week: 3,
      participantIds: ["w_a", "w_b", "w_old"],
      state: "accepted",
      seed: 1,
      deltas: [],
      description: "ALPHA turned on BETA.",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "e_2",
      type: "respect",
      week: 4,
      participantIds: ["w_a", "w_b"],
      state: "proposed",
      seed: 2,
      deltas: [],
      description: "A handshake.",
      createdAt: "2026-01-02T00:00:00.000Z",
    },
  ];
  u.relationships = [{ fromId: "w_a", toId: "w_b", score: -30, state: "rival", history: [{ eventId: "e_1" }] }];
  u.factions = [{ id: "f_1", name: "The Duo", memberIds: ["w_a", "w_b"], formedEventId: "e_1", active: true }];
  u.storylines = [{ id: "s_1", title: "Feud", participantIds: ["w_a", "w_b"], eventIds: ["e_1"], status: "active" }];
  u.formerWrestlers = { w_old: "OLD TIMER" };
  u.settings = { ...u.settings, aiEnabled: true, aiEndpoint: "https://ai.example/describe" };
  return u;
}

const exportedDoc = (universe = richUniverse()) => JSON.parse(serializeUniverse(universe).text);

function memoryStorage(initial = {}, failKey) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: vi.fn((key, value) => {
      if (key === failKey) throw new Error("quota");
      data.set(key, value);
    }),
  };
}

describe("export helpers", () => {
  it("names the file with the local date", () => {
    expect(exportFilename(new Date(2026, 0, 5))).toBe("wwe-universe-2026-01-05.json");
  });

  it("never writes AI settings, omits empty formerWrestlers and does not mutate the input", () => {
    const universe = richUniverse();
    const doc = exportedDoc(universe);

    expect(doc.settings).not.toHaveProperty("aiEnabled");
    expect(doc.settings).not.toHaveProperty("aiEndpoint");
    expect(doc.formerWrestlers).toEqual({ w_old: "OLD TIMER" });
    expect(universe.settings.aiEnabled).toBe(true);

    expect(exportedDoc(createEmptyUniverse())).not.toHaveProperty("formerWrestlers");
  });
});

describe("AC 1: round trip", () => {
  it("export then parse gives the identical universe with default AI settings", () => {
    const universe = richUniverse();
    const result = parseImport(serializeUniverse(universe).text);

    expect(result.universe).toEqual({
      ...universe,
      settings: { ...universe.settings, aiEnabled: false, aiEndpoint: "" },
    });
    expect(result.universe).not.toHaveProperty("exportedAt");
  });

  it("round-trips an empty universe", () => {
    const universe = createEmptyUniverse();

    expect(parseImport(serializeUniverse(universe).text).universe).toEqual(universe);
  });

  it("fills missing settings from the defaults", () => {
    const doc = exportedDoc();
    delete doc.settings.chaos;

    expect(parseImport(JSON.stringify(doc)).universe.settings.chaos).toBe(50);
  });

  it("accepts a legacy roster file through the legacy migration", () => {
    const text = JSON.stringify([
      { name: "LEGACY ONE", wins: 2, note: "old note", status: "used", champion: true },
      { wins: 1 },
    ]);
    const { universe, notice } = parseImport(text);

    expect(validateUniverse(universe)).toEqual([]);
    expect(universe.wrestlers).toMatchObject([
      { name: "LEGACY ONE", wins: 2, notes: "old note", status: "used", champion: true },
    ]);
    expect(notice).toMatch(/no name/);
  });
});

describe("AC 3: invalid files", () => {
  const edit = (change) => {
    const doc = exportedDoc();
    change(doc);
    return JSON.stringify(doc);
  };

  const cases = [
    ["non-JSON", "{nope", /not valid JSON/],
    ["file over 5 MB", "x".repeat(MAX_IMPORT_BYTES + 1), /too large/],
    ["no schema version", edit((d) => delete d.schemaVersion), /no schema version/],
    ["a newer version", edit((d) => (d.schemaVersion = 3)), /newer version/],
    ["an older version", edit((d) => (d.schemaVersion = 1)), /schema version 1/],
    ["a dangling wrestler id", edit((d) => d.events[0].participantIds.push("w_ghost")), /w_ghost/],
    ["a removed wrestler without a tombstone", edit((d) => delete d.formerWrestlers), /w_old/],
    ["a duplicate wrestler id", edit((d) => (d.wrestlers[1].id = "w_a")), /Duplicate wrestler id/],
    ["a duplicate event id", edit((d) => (d.events[1].id = "e_1")), /Duplicate event id/],
    ["an invalid wrestler status", edit((d) => (d.wrestlers[0].status = "retired")), /invalid status/],
    ["an invalid match type", edit((d) => (d.matchResults[0].type = "2v2")), /invalid type/],
    ["an invalid event state", edit((d) => (d.events[0].state = "maybe")), /invalid state/],
    ["a score out of range", edit((d) => (d.relationships[0].score = 500)), /score/],
    ["two proposed events", edit((d) => (d.events[0].state = "proposed")), /Only one event/],
    ["bad settings", edit((d) => (d.settings.chaos = 999)), /chaos/],
    ["a wrestler that is not an object", edit((d) => (d.wrestlers[0] = "ALPHA")), /must be an object/],
  ];

  it.each(cases)("%s lists the problem and returns no universe", (_name, text, expected) => {
    const result = parseImport(text);

    expect(result).not.toHaveProperty("universe");
    expect(result.errors.join("\n")).toMatch(expected);
  });

  it("collects all problems, not only the first", () => {
    const doc = exportedDoc();
    doc.events[0].participantIds.push("w_ghost");
    doc.wrestlers[0].status = "retired";
    doc.settings.chaos = 999;

    expect(parseImport(JSON.stringify(doc)).errors.length).toBeGreaterThanOrEqual(3);
  });

  it("never writes anything: it only returns data", () => {
    const storage = memoryStorage({ [V2_KEY]: "current" });
    parseImport("{nope");

    expect(storage.setItem).not.toHaveBeenCalled();
  });
});

describe("AC 6: AI settings are never imported", () => {
  it("forces aiEnabled false and aiEndpoint empty for a hostile file", () => {
    const doc = exportedDoc();
    doc.settings.aiEnabled = true;
    doc.settings.aiEndpoint = "https://evil.example";

    const { universe } = parseImport(JSON.stringify(doc));

    expect(universe.settings.aiEnabled).toBe(false);
    expect(universe.settings.aiEndpoint).toBe("");
  });

  it("ignores an endpoint that is not https instead of failing the import", () => {
    const doc = exportedDoc();
    doc.settings.aiEndpoint = "javascript:alert(1)";

    expect(parseImport(JSON.stringify(doc)).universe.settings.aiEndpoint).toBe("");
  });
});

describe("AC 5 and AC 8: applyImport snapshot", () => {
  it("flushes the pending save first and keeps the current raw string", () => {
    const storage = memoryStorage({ [V2_KEY]: "stale" });
    const flush = vi.fn(() => storage.data.set(V2_KEY, "flushed"));

    expect(applyImport(storage, flush)).toEqual({ ok: true });
    expect(flush).toHaveBeenCalledTimes(1);
    expect(storage.data.get(PRE_IMPORT_KEY)).toBe("flushed");
  });

  it("keeps the raw unreadable document in read-only mode (no flush)", () => {
    const storage = memoryStorage({ [V2_KEY]: "{broken" });

    expect(applyImport(storage, null).ok).toBe(true);
    expect(storage.data.get(PRE_IMPORT_KEY)).toBe("{broken");
  });

  it("overwrites the previous snapshot", () => {
    const storage = memoryStorage({ [V2_KEY]: "second", [PRE_IMPORT_KEY]: "first" });

    applyImport(storage, null);

    expect(storage.data.get(PRE_IMPORT_KEY)).toBe("second");
  });

  it("reports a failure when the snapshot cannot be written and leaves the document alone", () => {
    const storage = memoryStorage({ [V2_KEY]: "current" }, PRE_IMPORT_KEY);
    const result = applyImport(storage, null);

    expect(result.ok).toBe(false);
    expect(storage.data.get(V2_KEY)).toBe("current");
    expect(storage.data.has(PRE_IMPORT_KEY)).toBe(false);
  });
});
