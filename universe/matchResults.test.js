import { describe, expect, it } from "vitest";
import { createEmptyUniverse } from "./schema.js";
import { recordResult, undoLastResult } from "./matchResults.js";

function wrestler(id, overrides = {}) {
  return { id, name: id.toUpperCase(), status: "available", wins: 0, champion: false, notes: "", ...overrides };
}

function universe() {
  const u = createEmptyUniverse();
  u.wrestlers = [wrestler("w_a", { wins: 2 }), wrestler("w_b", { status: "title-shot" }), wrestler("w_c", { champion: true })];
  return u;
}

function payload(overrides = {}) {
  return {
    id: "m_1",
    recordedAt: "2026-01-01T00:00:00.000Z",
    seed: 7,
    week: 3,
    type: "3MAN ELI",
    participantIds: ["w_a", "w_b", "w_c"],
    winnerIds: ["w_b"],
    ...overrides,
  };
}

describe("recordResult (AC 1, AC 2)", () => {
  it("AC 1: stores the result and adds one win to the winner only", () => {
    const before = universe();
    const after = recordResult(before, payload());

    expect(after.matchResults).toEqual([payload()]);
    expect(after.wrestlers.find((w) => w.id === "w_b").wins).toBe(1);
    expect(after.wrestlers.find((w) => w.id === "w_a").wins).toBe(2);
    expect(after.wrestlers.find((w) => w.id === "w_c").wins).toBe(0);
  });

  it("stores the optional player wrestler and rejects non-participants", () => {
    const saved = recordResult(universe(), payload({ playerWrestlerId: "w_a" }));
    expect(saved.matchResults[0].playerWrestlerId).toBe("w_a");
    const before = universe();
    expect(recordResult(before, payload({ playerWrestlerId: "w_unknown" }))).toBe(before);
  });

  it("AC 1: leaves status and champion untouched", () => {
    const after = recordResult(universe(), payload({ winnerIds: ["w_c"] }));
    expect(after.wrestlers.find((w) => w.id === "w_c")).toMatchObject({ champion: true, status: "available" });
    expect(after.wrestlers.find((w) => w.id === "w_b").status).toBe("title-shot");
  });

  it("does not mutate the input universe", () => {
    const before = universe();
    recordResult(before, payload());
    expect(before.matchResults).toEqual([]);
    expect(before.wrestlers[1].wins).toBe(0);
  });

  it("AC 1: ignores the same match when it is recorded twice", () => {
    const once = recordResult(universe(), payload());
    const twice = recordResult(once, payload({ winnerIds: ["w_a"] }));
    expect(twice).toBe(once);
  });

  it("AC 2: ignores a winner who is not a participant or no winner at all", () => {
    const before = universe();
    expect(recordResult(before, payload({ winnerIds: ["w_x"] }))).toBe(before);
    expect(recordResult(before, payload({ winnerIds: [] }))).toBe(before);
    expect(recordResult(before, payload({ winnerIds: undefined }))).toBe(before);
  });
});

describe("undoLastResult (AC 4, AC 6)", () => {
  it("AC 4: removes the latest result and takes one win back, one result at a time", () => {
    let u = recordResult(universe(), payload({ id: "m_1", winnerIds: ["w_a"] }));
    u = recordResult(u, payload({ id: "m_2", week: 4, type: "1v1", participantIds: ["w_a", "w_b"], winnerIds: ["w_b"] }));
    expect(u.wrestlers.map((w) => w.wins)).toEqual([3, 1, 0]);

    u = undoLastResult(u);
    expect(u.matchResults.map((m) => m.id)).toEqual(["m_1"]);
    expect(u.wrestlers.map((w) => w.wins)).toEqual([3, 0, 0]);

    u = undoLastResult(u);
    expect(u.matchResults).toEqual([]);
    expect(u.wrestlers.map((w) => w.wins)).toEqual([2, 0, 0]);
  });

  it("AC 4: never takes wins below 0 and does nothing without results", () => {
    const u = recordResult(universe(), payload());
    const lowered = { ...u, wrestlers: u.wrestlers.map((w) => ({ ...w, wins: 0 })) };
    expect(undoLastResult(lowered).wrestlers.every((w) => w.wins === 0)).toBe(true);

    const empty = universe();
    expect(undoLastResult(empty)).toBe(empty);
  });

  it("AC 6: still removes the result when the winner is no longer on the roster", () => {
    const u = recordResult(universe(), payload());
    const withoutWinner = { ...u, wrestlers: u.wrestlers.filter((w) => w.id !== "w_b") };

    const after = undoLastResult(withoutWinner);
    expect(after.matchResults).toEqual([]);
    expect(after.wrestlers.map((w) => w.id)).toEqual(["w_a", "w_c"]);
  });
});
