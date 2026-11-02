import { describe, expect, it } from "vitest";
import { reducer } from "./UniverseContext.jsx";
import {
  applyDelta,
  getRelationship,
  listFor,
  nameOf,
  RelationshipError,
  stateOf,
} from "./relationships.js";
import { createEmptyUniverse, validateUniverse } from "./schema.js";

function deepFreeze(obj) {
  Object.values(obj).forEach((v) => {
    if (v && typeof v === "object") deepFreeze(v);
  });
  return Object.freeze(obj);
}

function wrestler(id, name) {
  return { id, name, status: "available", wins: 0, champion: false, notes: "" };
}

function base() {
  const u = createEmptyUniverse();
  u.wrestlers = [wrestler("w_a", "ALPHA"), wrestler("w_b", "BRAVO")];
  return u;
}

const source = { week: 3, matchId: "m_1", reason: "Cost him the match" };
const move = (u, extra = {}) =>
  applyDelta(u, { fromId: "w_a", toId: "w_b", delta: 10, source, ...extra });

describe("AC 1: apply delta", () => {
  it("starts missing relationships at 0, recomputes state and appends one history entry", () => {
    const u = deepFreeze(base());
    const next = move(u, { delta: -25 });
    const rel = getRelationship(next, "w_a", "w_b");
    expect(rel).toMatchObject({ fromId: "w_a", toId: "w_b", score: -25, state: "rival" });
    expect(rel.history).toHaveLength(1);
    expect(rel.history[0]).toMatchObject({
      id: expect.stringMatching(/^h_/),
      matchId: "m_1",
      week: 3,
      delta: -25,
      scoreAfter: -25,
      participantIds: ["w_a", "w_b"],
      reason: "Cost him the match",
    });
    expect(u.relationships).toEqual([]);
    expect(validateUniverse(next)).toEqual([]);
  });

  it("accumulates on an existing relationship and keeps others untouched", () => {
    let u = move(base(), { delta: 15 });
    u = applyDelta(u, { fromId: "w_b", toId: "w_a", delta: 5, source });
    const next = deepFreeze(move(u, { delta: 10 }));
    expect(getRelationship(next, "w_a", "w_b")).toMatchObject({ score: 25, state: "ally" });
    expect(getRelationship(next, "w_a", "w_b").history).toHaveLength(2);
    expect(getRelationship(next, "w_b", "w_a").score).toBe(5);
  });

  it("clamps at -100 and 100 and records requested delta with clamped scoreAfter", () => {
    const up = move(move(base(), { delta: 90 }), { delta: 50 });
    const rel = getRelationship(up, "w_a", "w_b");
    expect(rel.score).toBe(100);
    expect(rel.history[1]).toMatchObject({ delta: 50, scoreAfter: 100 });
    const down = move(base(), { delta: -500 });
    expect(getRelationship(down, "w_a", "w_b")).toMatchObject({ score: -100, state: "enemy" });
  });

  it("uses given participantIds and eventId", () => {
    const next = move(base(), {
      source: { week: 1, eventId: "e_1", participantIds: ["w_a", "w_b", "w_c"], reason: "Ambush" },
    });
    const entry = getRelationship(next, "w_a", "w_b").history[0];
    expect(entry.eventId).toBe("e_1");
    expect(entry.matchId).toBeUndefined();
    expect(entry.participantIds).toEqual(["w_a", "w_b", "w_c"]);
  });
});

describe("AC 2: state mapping", () => {
  it.each([
    [-100, "enemy"],
    [-61, "enemy"],
    [-60, "enemy"],
    [-59, "rival"],
    [-20, "rival"],
    [-19, "neutral"],
    [0, "neutral"],
    [19, "neutral"],
    [20, "ally"],
    [100, "ally"],
  ])("stateOf(%i) is %s", (score, state) => {
    expect(stateOf(score)).toBe(state);
  });
});

describe("AC 3: direction", () => {
  it("changes only A→B when not mutual", () => {
    const next = move(base(), { mutual: false });
    expect(getRelationship(next, "w_a", "w_b").score).toBe(10);
    expect(getRelationship(next, "w_b", "w_a")).toBeUndefined();
    expect(next.relationships).toHaveLength(1);
  });

  it("changes both directions with their own history when mutual", () => {
    const next = move(base(), { mutual: true, delta: -30 });
    const ab = getRelationship(next, "w_a", "w_b");
    const ba = getRelationship(next, "w_b", "w_a");
    expect([ab.score, ba.score]).toEqual([-30, -30]);
    expect(ab.history).toHaveLength(1);
    expect(ba.history).toHaveLength(1);
    expect(ab.history[0].id).not.toBe(ba.history[0].id);
    expect(ab.history[0].scoreAfter).toBe(-30);
    expect(ba.history[0].scoreAfter).toBe(-30);
  });
});

describe("AC 4: invalid", () => {
  const u = deepFreeze(base());
  const bad = [
    ["self-pair", { toId: "w_a" }],
    ["unknown from", { fromId: "w_zzz" }],
    ["unknown to", { toId: "w_zzz" }],
    ["fractional delta", { delta: 1.5 }],
    ["NaN delta", { delta: NaN }],
    ["Infinity delta", { delta: Infinity }],
    ["string delta", { delta: "5" }],
    ["missing reason", { source: { week: 1 } }],
    ["blank reason", { source: { week: 1, reason: "  " } }],
    ["missing source", { source: undefined }],
    ["non-integer week", { source: { week: 1.5, reason: "x" } }],
  ];

  it.each(bad)("%s throws RelationshipError and leaves the input unchanged", (_name, extra) => {
    const before = JSON.stringify(u);
    expect(() => move(u, extra)).toThrow(RelationshipError);
    expect(() => move(u, extra)).toThrow(/\S/);
    expect(JSON.stringify(u)).toBe(before);
  });

  it("accepts delta 0 without history or a new relationship", () => {
    const next = move(u, { delta: 0 });
    expect(next.relationships).toEqual([]);
    expect(move(u, { delta: 0, mutual: true }).relationships).toEqual([]);
    const existing = move(u);
    expect(move(existing, { delta: 0 }).relationships).toEqual(existing.relationships);
  });

  it("still rejects delta 0 for invalid input", () => {
    expect(() => move(u, { delta: 0, toId: "w_a" })).toThrow(RelationshipError);
  });
});

describe("AC 5: removed wrestler", () => {
  function removed() {
    const u = move(base(), { mutual: true });
    return reducer(
      { universe: u, readOnly: false, notice: null, saveError: null, banners: [] },
      { type: "removeWrestler", id: "w_b" },
    ).universe;
  }

  it("keeps the name, relationships and listing after removal", () => {
    const u = removed();
    expect(u.wrestlers.map((w) => w.id)).toEqual(["w_a"]);
    expect(u.formerWrestlers).toEqual({ w_b: "BRAVO" });
    expect(u.relationships).toHaveLength(2);
    expect(listFor(u, "w_a").map((r) => r.toId)).toEqual(["w_b"]);
    expect(listFor(u, "w_b").map((r) => r.toId)).toEqual(["w_a"]);
    expect(nameOf(u, "w_b")).toEqual({ name: "BRAVO", former: true });
    expect(nameOf(u, "w_a")).toEqual({ name: "ALPHA", former: false });
    expect(nameOf(u, "w_none")).toEqual({ name: "Unknown wrestler", former: true });
    expect(validateUniverse(u)).toEqual([]);
  });

  it("rejects deltas involving a former wrestler in either position", () => {
    const u = deepFreeze(removed());
    expect(() => move(u)).toThrow(RelationshipError);
    expect(() => applyDelta(u, { fromId: "w_b", toId: "w_a", delta: 1, source })).toThrow(
      /removed from the roster/,
    );
  });
});

describe("reducer action applyRelationshipDelta", () => {
  const state = (universe) => ({ universe, readOnly: false, notice: null, saveError: null, banners: [] });

  it("applies a valid delta", () => {
    const next = reducer(state(base()), { type: "applyRelationshipDelta", fromId: "w_a", toId: "w_b", delta: 7, source });
    expect(getRelationship(next.universe, "w_a", "w_b").score).toBe(7);
  });

  it("ignores an invalid delta without throwing", () => {
    const s = state(base());
    const next = reducer(s, { type: "applyRelationshipDelta", fromId: "w_a", toId: "w_a", delta: 7, source });
    expect(next).toBe(s);
  });
});

describe("AC 6: persistence and validation", () => {
  it("survives a JSON save/load round trip and stays valid", () => {
    const u = move(base(), { mutual: true, delta: -70 });
    const loaded = JSON.parse(JSON.stringify(u));
    expect(loaded.relationships).toEqual(u.relationships);
    expect(validateUniverse(loaded)).toEqual([]);
  });

  const withRel = (rel) => {
    const u = base();
    u.relationships = [{ fromId: "w_a", toId: "w_b", score: 0, state: "neutral", history: [], ...rel }];
    return u;
  };

  it("rejects scores outside -100..100 and non-integer scores", () => {
    expect(validateUniverse(withRel({ score: 101, state: "ally" })).join(" ")).toMatch(/score/);
    expect(validateUniverse(withRel({ score: -101, state: "enemy" })).join(" ")).toMatch(/score/);
    expect(validateUniverse(withRel({ score: 1.5 })).join(" ")).toMatch(/score/);
  });

  it("rejects a self-relationship", () => {
    expect(validateUniverse(withRel({ toId: "w_a" })).join(" ")).toMatch(/themselves/);
  });

  it("rejects a state that disagrees with the score", () => {
    expect(validateUniverse(withRel({ score: -60, state: "rival" })).join(" ")).toMatch(/does not match/);
    expect(validateUniverse(withRel({ score: 0, state: "ally" })).join(" ")).toMatch(/does not match/);
  });

  it("rejects a duplicated ordered pair", () => {
    const u = withRel({});
    u.relationships.push({ ...u.relationships[0] });
    expect(validateUniverse(u).join(" ")).toMatch(/duplicates/);
  });

  it("accepts a consistent relationship with a former counterpart", () => {
    const u = withRel({ score: 80, state: "ally" });
    u.wrestlers = [wrestler("w_a", "ALPHA")];
    u.formerWrestlers = { w_b: "BRAVO" };
    expect(validateUniverse(u)).toEqual([]);
  });
});
