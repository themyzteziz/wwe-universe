import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./constants.js";
import { createEmptyUniverse, newId, validateUniverse } from "./schema.js";

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

describe("AC 1: empty universe", () => {
  it("has version 2, week 1, empty collections and default settings", () => {
    const u = createEmptyUniverse();
    expect(u.schemaVersion).toBe(2);
    expect(u.week).toBe(1);
    for (const key of ["wrestlers", "matchResults", "events", "relationships", "factions", "storylines"]) {
      expect(u[key]).toEqual([]);
    }
    expect(u.settings).toMatchObject({ ...DEFAULT_SETTINGS, seed: expect.any(Number) });
    expect(Number.isInteger(u.settings.seed)).toBe(true);
    expect(u.formerWrestlers).toEqual({});
  });

  it("is valid and does not share state between calls", () => {
    const a = createEmptyUniverse();
    a.wrestlers.push({});
    expect(validateUniverse(createEmptyUniverse())).toEqual([]);
    expect(createEmptyUniverse().wrestlers).toEqual([]);
  });
});

describe("AC 2: stable IDs", () => {
  it("newId returns different prefixed strings", () => {
    const a = newId("w");
    const b = newId("w");
    expect(a).not.toBe(b);
    expect(a.startsWith("w_")).toBe(true);
    expect(b.startsWith("w_")).toBe(true);
  });

  it("same-name wrestlers get different ids and renaming keeps the id", () => {
    const u = universeWith([]);
    const mk = (name) => ({ id: newId("w"), name, status: "available", wins: 0, champion: false, notes: "" });
    u.wrestlers.push(mk("John"), mk("John"));
    const [first, second] = u.wrestlers;
    expect(first.id).not.toBe(second.id);

    u.relationships.push({ fromId: first.id, toId: second.id, score: 10, state: "neutral", history: [] });
    const idBefore = first.id;
    first.name = "Johnny";
    expect(first.id).toBe(idBefore);
    expect(validateUniverse(u)).toEqual([]);
  });
});

describe("AC 3: validation", () => {
  it("never throws and reports one error for non-objects", () => {
    for (const bad of [null, undefined, 5, "x", [], true]) {
      const errors = validateUniverse(bad);
      expect(errors).toHaveLength(1);
      expect(typeof errors[0]).toBe("string");
    }
  });

  it("rejects wrong schemaVersion", () => {
    const u = createEmptyUniverse();
    u.schemaVersion = 1;
    const errors = validateUniverse(u);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/schemaVersion/);
  });

  it("reports one error per missing or non-array collection", () => {
    const u = createEmptyUniverse();
    delete u.events;
    u.factions = "nope";
    const errors = validateUniverse(u);
    expect(errors).toHaveLength(2);
    expect(errors.join(" ")).toMatch(/events/);
    expect(errors.join(" ")).toMatch(/factions/);
  });

  it("accepts valid data", () => {
    const u = universeWith();
    u.relationships.push({ fromId: "w_a", toId: "w_b", score: 0, state: "neutral", history: [] });
    u.events.push({ id: "e_1", type: "save", week: 1, participantIds: ["w_a", "w_b"], state: "accepted" });
    u.matchResults.push({ id: "m_1", participantIds: ["w_a", "w_b"], winnerIds: ["w_a"] });
    u.factions.push({ id: "f_1", name: "F", memberIds: ["w_a"], formedEventId: "e_1", active: true });
    u.storylines.push({ id: "s_1", title: "S", participantIds: ["w_b"], eventIds: [], status: "active" });
    expect(validateUniverse(u)).toEqual([]);
  });

  it("flags every dangling reference, one error each", () => {
    const u = universeWith();
    u.relationships.push({ fromId: "w_x", toId: "w_y", score: 0, state: "n", history: [] });
    u.events.push({ id: "e_1", participantIds: ["w_x"], state: "accepted" });
    u.matchResults.push({ id: "m_1", participantIds: ["w_x"], winnerIds: ["w_y"] });
    u.factions.push({ id: "f_1", memberIds: ["w_x"] });
    u.storylines.push({ id: "s_1", participantIds: ["w_x"] });
    expect(validateUniverse(u)).toHaveLength(7);
  });

  it("flags duplicate wrestler ids", () => {
    const u = universeWith(["w_a", "w_a"]);
    const errors = validateUniverse(u);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/Duplicate/);
  });

  it("accepts ids of removed wrestlers listed in formerWrestlers", () => {
    const u = universeWith(["w_a"]);
    u.events.push({ id: "e_1", participantIds: ["w_a", "w_gone"], state: "accepted" });
    expect(validateUniverse(u)).toHaveLength(1);
    u.formerWrestlers = { w_gone: "Retired Guy" };
    expect(validateUniverse(u)).toEqual([]);
  });

  it("rejects two proposed events but allows one", () => {
    const u = universeWith();
    u.events.push({ id: "e_1", participantIds: ["w_a"], state: "proposed" });
    expect(validateUniverse(u)).toEqual([]);
    u.events.push({ id: "e_2", participantIds: ["w_b"], state: "proposed" });
    expect(validateUniverse(u)).toHaveLength(1);
  });

  it("reports invalid settings", () => {
    const u = createEmptyUniverse();
    u.settings.chaos = 150;
    expect(validateUniverse(u)).toHaveLength(1);
  });
});

describe("AC 4: notes separate", () => {
  it("only the Wrestler typedef declares notes", () => {
    const source = readFileSync(new URL("./schema.js", import.meta.url), "utf8");
    const blocks = source.split("@typedef").slice(1);
    const withNotes = blocks.filter((b) => /@property \{[^}]*\} \[?notes\]?\s/.test(b));
    expect(withNotes).toHaveLength(1);
    expect(withNotes[0]).toMatch(/Object\} Wrestler|\{Object\} Wrestler/);
  });

  it("an empty universe has no top-level notes", () => {
    expect(createEmptyUniverse()).not.toHaveProperty("notes");
  });
});
