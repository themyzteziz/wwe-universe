import { describe, expect, it } from "vitest";
import { reducer } from "./UniverseContext.jsx";
import { createEmptyUniverse } from "./schema.js";
import { ABANDON_AFTER_WEEKS, attachEvent, evaluateStatuses } from "./storylines.js";

const wrestler = (id, name) => ({
  id,
  name,
  status: "available",
  wins: 0,
  champion: false,
  notes: "",
});

const event = (id, type, ids, week, state = "accepted") => ({
  id,
  type,
  week,
  participantIds: ids,
  state,
  seed: 1,
  deltas: [],
  description: "",
  createdAt: "2026-01-01T00:00:00.000Z",
});

function universeWith(events) {
  return {
    ...createEmptyUniverse(),
    wrestlers: [wrestler("w_a", "ALPHA"), wrestler("w_b", "BETA"), wrestler("w_c", "GAMMA")],
    events,
  };
}

describe("AC 1: open", () => {
  it("opens a storyline for an accepted rival-type event and links the event", () => {
    const e = event("e_1", "ambush", ["w_a", "w_b"], 3);
    const u = attachEvent(universeWith([e]), e);
    expect(u.storylines).toHaveLength(1);
    expect(u.storylines[0]).toMatchObject({
      id: expect.stringMatching(/^s_/),
      title: "ALPHA vs BETA",
      participantIds: ["w_a", "w_b"],
      eventIds: ["e_1"],
      status: "open",
      openedWeek: 3,
      lastWeek: 3,
    });
    expect(u.events[0].storylineId).toBe(u.storylines[0].id);
  });

  it("does not open a storyline for a non-rival event", () => {
    const e = event("e_1", "save", ["w_a", "w_b"], 3);
    const start = universeWith([e]);
    expect(attachEvent(start, e)).toBe(start);
  });

  it("ignores events with fewer than two participants", () => {
    const e = event("e_1", "ambush", ["w_a"], 3);
    const start = universeWith([e]);
    expect(attachEvent(start, e)).toBe(start);
  });
});

describe("AC 2: append", () => {
  it("appends a second event for the same pair in either order", () => {
    const e1 = event("e_1", "ambush", ["w_a", "w_b"], 3);
    const e2 = event("e_2", "confrontation", ["w_b", "w_a"], 5);
    const e3 = event("e_3", "betrayal", ["w_a", "w_b"], 6);
    let u = universeWith([e1, e2, e3]);
    u = attachEvent(u, e1);
    u = attachEvent(u, e2);
    u = attachEvent(u, e3);
    expect(u.storylines).toHaveLength(1);
    expect(u.storylines[0]).toMatchObject({
      eventIds: ["e_1", "e_2", "e_3"],
      lastWeek: 6,
      openedWeek: 3,
      status: "open",
    });
    expect(u.events.every((e) => e.storylineId === u.storylines[0].id)).toBe(true);
  });

  it("opens a separate storyline for a different pair", () => {
    const e1 = event("e_1", "ambush", ["w_a", "w_b"], 3);
    const e2 = event("e_2", "ambush", ["w_a", "w_c"], 4);
    let u = universeWith([e1, e2]);
    u = attachEvent(attachEvent(u, e1), e2);
    expect(u.storylines).toHaveLength(2);
  });
});

describe("AC 3: resolve", () => {
  it.each(["respect", "faction"])("a %s event resolves an open rivalry", (type) => {
    const e1 = event("e_1", "ambush", ["w_a", "w_b"], 3);
    const e2 = event("e_2", type, ["w_b", "w_a"], 7);
    let u = universeWith([e1, e2]);
    u = attachEvent(attachEvent(u, e1), e2);
    expect(u.storylines).toHaveLength(1);
    expect(u.storylines[0]).toMatchObject({
      status: "resolved",
      resolvedWeek: 7,
      lastWeek: 7,
      eventIds: ["e_1", "e_2"],
    });
  });

  it("a resolved storyline is never reopened or appended to", () => {
    const e1 = event("e_1", "ambush", ["w_a", "w_b"], 3);
    const e2 = event("e_2", "respect", ["w_a", "w_b"], 4);
    const e3 = event("e_3", "ambush", ["w_a", "w_b"], 5);
    let u = universeWith([e1, e2, e3]);
    u = attachEvent(attachEvent(u, e1), e2);
    u = attachEvent(u, e3);
    expect(u.storylines).toHaveLength(2);
    expect(u.storylines[0]).toMatchObject({ status: "resolved", eventIds: ["e_1", "e_2"] });
    expect(u.storylines[1]).toMatchObject({ status: "open", eventIds: ["e_3"], openedWeek: 5 });
  });

  it("respect with no storyline creates none", () => {
    const e = event("e_1", "respect", ["w_a", "w_b"], 3);
    const start = universeWith([e]);
    const u = attachEvent(start, e);
    expect(u.storylines).toEqual([]);
    expect(u).toBe(start);
  });
});

describe("AC 4: abandon", () => {
  const openAt = (lastWeek) => {
    const e = event("e_1", "ambush", ["w_a", "w_b"], lastWeek);
    return attachEvent(universeWith([e]), e);
  };

  it("abandons at 8 weeks of silence and stays open at 7", () => {
    expect(ABANDON_AFTER_WEEKS).toBe(8);
    const u = openAt(3);
    expect(evaluateStatuses(u, 10).storylines[0].status).toBe("open");
    expect(evaluateStatuses(u, 10)).toBe(u);
    const abandoned = evaluateStatuses(u, 11);
    expect(abandoned.storylines[0]).toMatchObject({ status: "abandoned", resolvedWeek: 11 });
  });

  it("is idempotent and does not touch resolved storylines", () => {
    const abandoned = evaluateStatuses(openAt(3), 11);
    expect(evaluateStatuses(abandoned, 20)).toBe(abandoned);
    expect(evaluateStatuses(abandoned, 11)).toEqual(abandoned);

    const e1 = event("e_1", "ambush", ["w_a", "w_b"], 1);
    const e2 = event("e_2", "respect", ["w_a", "w_b"], 2);
    let u = universeWith([e1, e2]);
    u = attachEvent(attachEvent(u, e1), e2);
    expect(evaluateStatuses(u, 50)).toBe(u);
  });

  it("does not mutate its input", () => {
    const u = openAt(3);
    const snapshot = structuredClone(u);
    evaluateStatuses(u, 11);
    expect(u).toEqual(snapshot);
  });
});

describe("AC 5: rejected / proposed", () => {
  it.each(["proposed", "rejected"])("a %s event changes nothing", (state) => {
    const e = event("e_1", "ambush", ["w_a", "w_b"], 3, state);
    const start = universeWith([e]);
    const snapshot = structuredClone(start);
    const u = attachEvent(start, e);
    expect(u).toEqual(snapshot);
    expect(u.storylines).toEqual([]);
    expect(u.events[0]).not.toHaveProperty("storylineId");
  });

  it("a proposed event does not join an open storyline", () => {
    const e1 = event("e_1", "ambush", ["w_a", "w_b"], 3);
    const e2 = event("e_2", "ambush", ["w_a", "w_b"], 4, "proposed");
    let u = attachEvent(universeWith([e1, e2]), e1);
    const before = structuredClone(u);
    u = attachEvent(u, e2);
    expect(u).toEqual(before);
  });

  it("attaching the same accepted event twice does not duplicate it", () => {
    const e1 = event("e_1", "ambush", ["w_a", "w_b"], 3);
    const once = attachEvent(universeWith([e1]), e1);
    const twice = attachEvent(once, e1);
    expect(twice).toBe(once);
    expect(twice.storylines).toHaveLength(1);
    expect(twice.storylines[0].eventIds).toEqual(["e_1"]);
  });
});

describe("reducer wiring", () => {
  const stateOf = (universe) => ({
    universe,
    readOnly: false,
    notice: null,
    saveError: null,
    banners: [],
  });

  it("attachEvent action groups an accepted event and ignores unknown ids", () => {
    const start = stateOf(universeWith([event("e_1", "ambush", ["w_a", "w_b"], 1)]));
    const next = reducer(start, { type: "attachEvent", eventId: "e_1" });
    expect(next.universe.storylines).toHaveLength(1);
    expect(next.universe.events[0].storylineId).toBe(next.universe.storylines[0].id);
    expect(reducer(start, { type: "attachEvent", eventId: "e_x" })).toBe(start);
  });

  it("attachEvent action leaves proposed events alone", () => {
    const start = stateOf(universeWith([event("e_1", "ambush", ["w_a", "w_b"], 1, "proposed")]));
    expect(reducer(start, { type: "attachEvent", eventId: "e_1" })).toBe(start);
  });

  it("setWeek abandons stale open storylines and keeps fresh ones", () => {
    const e = event("e_1", "ambush", ["w_a", "w_b"], 3);
    const open = attachEvent(universeWith([e]), e);
    const at10 = reducer(stateOf(open), { type: "setWeek", week: 10 }).universe;
    expect(at10.week).toBe(10);
    expect(at10.storylines[0].status).toBe("open");
    const at11 = reducer(stateOf(open), { type: "setWeek", week: 11 }).universe;
    expect(at11.storylines[0]).toMatchObject({ status: "abandoned", resolvedWeek: 11 });
  });
});
