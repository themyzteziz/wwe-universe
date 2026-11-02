import { describe, expect, it } from "vitest";
import {
  avgInternalScore,
  canForm,
  dissolutionCandidates,
  dissolveFaction,
  formFaction,
  generateName,
  renameFaction,
  WORDS_A,
  WORDS_B,
} from "./factions.js";
import { createEmptyUniverse, validateUniverse } from "./schema.js";
import { createRng } from "./sim/rng.js";
import { reducer } from "./UniverseContext.jsx";

const IDS = ["w_1", "w_2", "w_3", "w_4", "w_5", "w_6"];

function rel(fromId, toId, score) {
  return { fromId, toId, score, state: "neutral", history: [] };
}

// Every ordered pair among `ids` gets `score`.
function mutual(ids, score) {
  return ids.flatMap((a) => ids.filter((b) => b !== a).map((b) => rel(a, b, score)));
}

function build({ relationships = mutual(IDS, 20), factions = [], week = 4 } = {}) {
  return {
    ...createEmptyUniverse(),
    week,
    wrestlers: IDS.map((id, i) => ({
      id,
      name: `WRESTLER ${i + 1}`,
      status: i === 0 ? "title-shot" : "available",
      wins: i,
      champion: i === 1,
      notes: "",
    })),
    relationships,
    factions,
  };
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

function faction(overrides = {}) {
  return {
    id: "f_1",
    name: "Iron Order",
    memberIds: ["w_1", "w_2"],
    formedEventId: "e_1",
    formedWeek: 1,
    active: true,
    ...overrides,
  };
}

const failure = { ok: false, error: expect.any(String) };

describe("AC 1: eligibility", () => {
  const cases = [
    ["two founders at exactly 20 both ways", ["w_1", "w_2"], {}, true],
    ["five founders", ["w_1", "w_2", "w_3", "w_4", "w_5"], {}, true],
    ["a single founder", ["w_1"], {}, false],
    ["six founders", IDS, {}, false],
    ["a duplicate id", ["w_1", "w_1"], {}, false],
    ["an unknown wrestler", ["w_1", "w_missing"], {}, false],
    ["not an array", "w_1", {}, false],
    [
      "a founder already in an active faction",
      ["w_1", "w_2"],
      { factions: [faction({ memberIds: ["w_2", "w_3"] })] },
      false,
    ],
    [
      "a founder who was in a dissolved faction",
      ["w_1", "w_2"],
      { factions: [faction({ memberIds: ["w_2", "w_3"], active: false })] },
      true,
    ],
    [
      "score 19 from the first to the second",
      ["w_1", "w_2"],
      { relationships: [rel("w_1", "w_2", 19), rel("w_2", "w_1", 20)] },
      false,
    ],
    [
      "score 19 from the second to the first",
      ["w_1", "w_2"],
      { relationships: [rel("w_1", "w_2", 20), rel("w_2", "w_1", 19)] },
      false,
    ],
    ["a missing relationship (counts as 0)", ["w_1", "w_2"], { relationships: [rel("w_1", "w_2", 50)] }, false],
  ];

  it.each(cases)("%s", (_label, memberIds, setup, expected) => {
    const result = canForm(build(setup), memberIds);
    expect(result.ok).toBe(expected);
    if (!expected) expect(result).toEqual(failure);
  });

  it("rejects a founder who was removed from the roster", () => {
    const universe = build();
    universe.wrestlers = universe.wrestlers.filter((w) => w.id !== "w_2");
    universe.formerWrestlers = { w_2: "OLD TIMER" };
    expect(canForm(universe, ["w_1", "w_2"])).toEqual(failure);
  });
});

describe("AC 2: create", () => {
  it("adds an active faction with the required fields", () => {
    const universe = deepFreeze(build({ week: 7 }));
    const result = formFaction(universe, ["w_1", "w_2", "w_3"], "e_9", createRng(1));
    expect(result.ok).toBe(true);
    expect(result.faction).toEqual({
      id: expect.stringMatching(/^f_/),
      name: expect.stringMatching(/\S/),
      memberIds: ["w_1", "w_2", "w_3"],
      formedEventId: "e_9",
      formedWeek: 7,
      active: true,
    });
    expect(result.faction.name.length).toBeLessThanOrEqual(40);
    expect(result.universe.factions).toEqual([result.faction]);
    expect(universe.factions).toEqual([]);
  });

  it("generates the same name for the same seed", () => {
    const u = build();
    const a = formFaction(u, ["w_1", "w_2"], "e_1", createRng(42));
    const b = formFaction(u, ["w_1", "w_2"], "e_1", createRng(42));
    expect(a.faction.name).toBe(b.faction.name);
    const [first, second] = a.faction.name.split(" ");
    expect(WORDS_A).toContain(first);
    expect(WORDS_B).toContain(second);
  });

  it("uses a trimmed player-chosen name when given", () => {
    const result = formFaction(build(), ["w_1", "w_2"], "e_1", createRng(1), "  The Pack  ");
    expect(result.faction.name).toBe("The Pack");
  });

  it("avoids the name of an active faction, then appends a number", () => {
    const first = { pick: (list) => list[0] };
    const base = `${WORDS_A[0]} ${WORDS_B[0]}`;
    expect(generateName(first, [])).toBe(base);
    expect(generateName(first, [base])).toBe(`${base} 2`);
    expect(generateName(first, [base, `${base} 2`])).toBe(`${base} 3`);
    // a collision on the first try is retried with the seeded rng
    const rng = createRng(3);
    const taken = generateName(createRng(3), []);
    expect(generateName(rng, [taken])).not.toBe(taken);
  });
});

describe("AC 3: dissolution candidates", () => {
  it("lists active factions with an average strictly below 0", () => {
    const universe = build({
      relationships: [
        rel("w_1", "w_2", -1),
        rel("w_2", "w_1", -1),
        rel("w_3", "w_4", 0),
        rel("w_4", "w_3", 0),
        rel("w_5", "w_6", 10),
        rel("w_6", "w_5", -11),
      ],
      factions: [
        faction({ id: "f_neg", memberIds: ["w_1", "w_2"] }),
        faction({ id: "f_zero", memberIds: ["w_3", "w_4"] }),
        faction({ id: "f_mixed", memberIds: ["w_5", "w_6"] }),
      ],
    });
    expect(dissolutionCandidates(universe).map((f) => f.id)).toEqual(["f_neg", "f_mixed"]);
    expect(avgInternalScore(universe, universe.factions[0])).toBe(-1);
    expect(avgInternalScore(universe, universe.factions[1])).toBe(0);
  });

  it("does not list an inactive faction and counts missing relationships as 0", () => {
    const universe = build({
      relationships: [rel("w_1", "w_2", -50), rel("w_2", "w_1", -50)],
      factions: [
        faction({ id: "f_off", memberIds: ["w_1", "w_2"], active: false }),
        faction({ id: "f_none", memberIds: ["w_3", "w_4"] }),
      ],
    });
    expect(dissolutionCandidates(universe)).toEqual([]);
  });
});

describe("AC 4: dissolve", () => {
  it("deactivates the faction, keeps the record and frees the members", () => {
    const universe = deepFreeze(build({ week: 9, factions: [faction({ memberIds: ["w_1", "w_2", "w_3"] })] }));
    const result = dissolveFaction(universe, "f_1", "e_5");
    expect(result.ok).toBe(true);
    expect(result.universe.factions).toHaveLength(1);
    expect(result.universe.factions[0]).toEqual({
      ...universe.factions[0],
      active: false,
      dissolvedWeek: 9,
      dissolvedEventId: "e_5",
    });
    expect(universe.factions[0].active).toBe(true);
    expect(canForm(result.universe, ["w_1", "w_2"]).ok).toBe(true);
    const again = formFaction(result.universe, ["w_1", "w_2"], "e_6", createRng(2));
    expect(again.ok).toBe(true);
    expect(again.universe.factions).toHaveLength(2);
  });

  it("works without an event id", () => {
    const result = dissolveFaction(build({ factions: [faction()] }), "f_1");
    expect(result.faction).not.toHaveProperty("dissolvedEventId");
    expect(result.faction.dissolvedWeek).toBe(4);
  });
});

describe("AC 5: rejections", () => {
  const universe = deepFreeze(
    build({
      factions: [faction({ memberIds: ["w_1", "w_2"] }), faction({ id: "f_off", name: "Gone", memberIds: ["w_3", "w_4"], active: false })],
    }),
  );
  const snapshot = structuredClone(universe);

  it.each([
    ["formFaction with an ineligible group", () => formFaction(universe, ["w_1", "w_5"], "e_1", createRng(1))],
    ["formFaction without an event", () => formFaction(universe, ["w_5", "w_6"], "", createRng(1))],
    ["formFaction with an empty name", () => formFaction(universe, ["w_5", "w_6"], "e_1", createRng(1), "   ")],
    ["formFaction with a 41-character name", () => formFaction(universe, ["w_5", "w_6"], "e_1", createRng(1), "x".repeat(41))],
    ["dissolveFaction of an unknown faction", () => dissolveFaction(universe, "f_nope")],
    ["dissolveFaction of an inactive faction", () => dissolveFaction(universe, "f_off")],
    ["renameFaction of an unknown faction", () => renameFaction(universe, "f_nope", "Name")],
    ["renameFaction with an empty name", () => renameFaction(universe, "f_1", "  ")],
    ["renameFaction with a non-text name", () => renameFaction(universe, "f_1", 5)],
    ["renameFaction with a 41-character name", () => renameFaction(universe, "f_1", "x".repeat(41))],
  ])("%s returns an error and changes nothing", (_label, run) => {
    expect(run()).toEqual(failure);
    expect(universe).toEqual(snapshot);
  });

  it("reducer keeps the same universe on a rule violation or a missing seed", () => {
    const state = { universe, readOnly: false, banners: [] };
    for (const action of [
      { type: "formFaction", memberIds: ["w_1", "w_5"], eventId: "e_1", seed: 1 },
      { type: "formFaction", memberIds: ["w_5", "w_6"], eventId: "e_1" },
      { type: "dissolveFaction", factionId: "f_off" },
      { type: "renameFaction", factionId: "f_1", name: "" },
    ]) {
      expect(reducer(state, action)).toBe(state);
    }
  });

  it("never changes champion, wins or title-shot status", () => {
    let state = { universe: build(), readOnly: false, banners: [] };
    const before = structuredClone(state.universe.wrestlers);
    state = reducer(state, { type: "formFaction", memberIds: ["w_1", "w_2"], eventId: "e_1", seed: 3 });
    const id = state.universe.factions[0].id;
    state = reducer(state, { type: "renameFaction", factionId: id, name: "New" });
    state = reducer(state, { type: "dissolveFaction", factionId: id });
    expect(state.universe.factions[0].active).toBe(false);
    expect(state.universe.wrestlers).toEqual(before);
  });
});

describe("AC 6: rename", () => {
  it("accepts 1 to 40 characters and trims", () => {
    const universe = build({ factions: [faction()] });
    expect(renameFaction(universe, "f_1", "  Z ").faction.name).toBe("Z");
    expect(renameFaction(universe, "f_1", "y".repeat(40)).faction.name).toHaveLength(40);
  });

  it("reducer renames the faction and the universe stays valid", () => {
    const state = { universe: build({ factions: [faction()] }), readOnly: false, banners: [] };
    const next = reducer(state, { type: "renameFaction", factionId: "f_1", name: "Black Legion" });
    expect(next.universe.factions[0].name).toBe("Black Legion");
    expect(validateUniverse(next.universe)).toEqual([]);
  });
});

describe("schema: optional faction fields", () => {
  it("accepts the new fields and rejects bad weeks or event ids", () => {
    const good = build({
      factions: [faction({ active: false, dissolvedWeek: 5, dissolvedEventId: "e_2" })],
    });
    expect(validateUniverse(good)).toEqual([]);
    const bad = build({
      factions: [faction({ formedWeek: 0, dissolvedWeek: 1.5, dissolvedEventId: 7 })],
    });
    expect(validateUniverse(bad)).toHaveLength(3);
  });
});
