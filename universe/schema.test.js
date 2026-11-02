import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./constants.js";
import { createEmptyUniverse, newId, validateUniverse } from "./schema.js";
import schemaSource from "./schema.js?raw";

function universeWith(wrestlerIds = ["w_a", "w_b"]) {
  const u = createEmptyUniverse();
  u.wrestlers = wrestlerIds.map((id) => ({
    id,
    name: id,
    status: "available",
    wins: 0,
    champion: false,
    notes: "",
  }));
  return u;
}

const ARRAYS = ["wrestlers", "matchResults", "events", "relationships", "factions", "storylines"];

describe("AC 1: empty universe", () => {
  it("has version 2, week 1, empty collections and default settings", () => {
    const u = createEmptyUniverse();
    expect(u.schemaVersion).toBe(2);
    expect(u.week).toBe(1);
    for (const key of ARRAYS) expect(u[key]).toEqual([]);
    expect(u.settings).toMatchObject({ ...DEFAULT_SETTINGS, seed: expect.any(Number) });
    expect(Number.isInteger(u.settings.seed)).toBe(true);
    expect(u.settings.eventFrequency).toBe(25);
    expect(u.settings.chaos).toBe(50);
    expect(u.settings.historySensitivity).toBe(50);
    expect(u.settings.autoPropose).toBe(true);
  });

  it("is valid and does not share state between calls", () => {
    const a = createEmptyUniverse();
    const b = createEmptyUniverse();
    expect(validateUniverse(a)).toEqual([]);
    a.wrestlers.push({ id: "w_x" });
    a.settings.chaos = 1;
    expect(b.wrestlers).toEqual([]);
    expect(b.settings.chaos).toBe(50);
    expect(DEFAULT_SETTINGS.chaos).toBe(50);
  });
});

describe("AC 2: stable ids", () => {
  it("newId returns different prefixed strings", () => {
    const a = newId("w");
    const b = newId("w");
    expect(a).not.toBe(b);
    expect(a.startsWith("w_")).toBe(true);
    expect(b.startsWith("w_")).toBe(true);
    expect(newId("e").startsWith("e_")).toBe(true);
  });

  it("same-name wrestlers get different ids and renaming keeps the id", () => {
    const u = createEmptyUniverse();
    const mk = () => ({
      id: newId("w"),
      name: "Cody",
      status: "available",
      wins: 0,
      champion: false,
      notes: "",
    });
    u.wrestlers.push(mk(), mk());
    expect(u.wrestlers[0].id).not.toBe(u.wrestlers[1].id);

    const [first, second] = u.wrestlers;
    u.relationships.push({
      fromId: first.id,
      toId: second.id,
      score: -30,
      state: "rival",
      history: [],
    });
    const idBefore = first.id;
    first.name = "Cody Rhodes";
    expect(first.id).toBe(idBefore);
    expect(first.id).not.toContain("Cody");
    expect(validateUniverse(u)).toEqual([]);
  });
});

describe("AC 3: validation", () => {
  it("never throws and reports one error for non-objects", () => {
    for (const bad of [null, undefined, 42, "text", [], true]) {
      let result;
      expect(() => {
        result = validateUniverse(bad);
      }).not.toThrow();
      expect(result).toHaveLength(1);
      expect(typeof result[0]).toBe("string");
    }
  });

  it("rejects wrong schemaVersion", () => {
    const u = createEmptyUniverse();
    u.schemaVersion = 1;
    expect(validateUniverse(u)).toHaveLength(1);
  });

  it("reports one error per missing or non-array collection", () => {
    for (const key of ARRAYS) {
      const missing = createEmptyUniverse();
      delete missing[key];
      expect(validateUniverse(missing)).toHaveLength(1);

      const wrongType = createEmptyUniverse();
      wrongType[key] = {};
      expect(validateUniverse(wrongType)).toHaveLength(1);
    }
  });

  it("accepts valid data", () => {
    const u = universeWith();
    u.relationships.push({ fromId: "w_a", toId: "w_b", score: 10, state: "neutral", history: [] });
    u.matchResults.push({
      id: "m_1",
      week: 1,
      type: "1v1",
      participantIds: ["w_a", "w_b"],
      winnerIds: ["w_a"],
      recordedAt: "2026-01-01T00:00:00.000Z",
    });
    u.events.push({
      id: "e_1",
      type: "respect",
      week: 1,
      participantIds: ["w_a", "w_b"],
      state: "proposed",
      seed: 1,
      deltas: [],
      description: "x",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    u.factions.push({
      id: "f_1",
      name: "F",
      memberIds: ["w_a", "w_b"],
      formedEventId: "e_1",
      active: true,
    });
    u.storylines.push({
      id: "s_1",
      title: "S",
      participantIds: ["w_a"],
      eventIds: ["e_1"],
      status: "active",
    });
    expect(validateUniverse(u)).toEqual([]);
  });

  it("flags every dangling reference, one error each", () => {
    const u = universeWith();
    u.relationships.push({ fromId: "w_zz", toId: "w_a", score: 0, state: "neutral", history: [] });
    u.relationships.push({ fromId: "w_a", toId: "w_yy", score: 0, state: "neutral", history: [] });
    u.events.push({ id: "e_1", state: "accepted", participantIds: ["w_a", "w_gone"] });
    u.matchResults.push({ id: "m_1", participantIds: ["w_a", "w_gone2"], winnerIds: ["w_gone3"] });
    u.factions.push({ id: "f_1", memberIds: ["w_gone4"] });
    u.storylines.push({ id: "s_1", participantIds: ["w_gone5"] });
    // 2 relationships + 1 event + 2 match result (participant, winner) + 1 faction + 1 storyline
    expect(validateUniverse(u)).toHaveLength(7);
  });

  it("flags duplicate wrestler ids", () => {
    const u = universeWith(["w_a", "w_a"]);
    const errors = validateUniverse(u);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("w_a");
  });

  it("accepts ids of removed wrestlers listed in formerWrestlers", () => {
    const u = universeWith(["w_a"]);
    u.events.push({ id: "e_1", state: "accepted", participantIds: ["w_a", "w_old"] });
    expect(validateUniverse(u)).toHaveLength(1);
    u.formerWrestlers = { w_old: "Old Timer" };
    expect(validateUniverse(u)).toEqual([]);
  });

  it("rejects two proposed events but allows one", () => {
    const u = universeWith();
    u.events.push({ id: "e_1", state: "proposed", participantIds: ["w_a"] });
    expect(validateUniverse(u)).toEqual([]);
    u.events.push({ id: "e_2", state: "proposed", participantIds: ["w_b"] });
    expect(validateUniverse(u)).toHaveLength(1);
  });

  it("reports invalid settings", () => {
    const u = universeWith();
    u.settings.chaos = 150;
    expect(validateUniverse(u)).toHaveLength(1);
  });
});

describe("AC 4: notes separate", () => {
  it("only the Wrestler typedef declares notes", () => {
    const blocks = schemaSource.split("@typedef").slice(1);
    const withNotes = blocks.filter((b) => /@property \{[^}]*\} \[?notes\]?\s/.test(b));
    expect(withNotes).toHaveLength(1);
    expect(withNotes[0]).toMatch(/\{Object\} Wrestler/);
  });

  it("an empty universe has no top-level notes", () => {
    expect(createEmptyUniverse()).not.toHaveProperty("notes");
  });
});
