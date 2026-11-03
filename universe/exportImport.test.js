import { exportFilename, serializeUniverse } from "./exportImport";
import { createEmptyUniverse, validateUniverse } from "./schema";

const NOW = new Date(2026, 10, 2, 9, 30);

function sampleUniverse() {
  const universe = createEmptyUniverse();
  universe.wrestlers = [
    { id: "w_1", name: "A", wins: 1, status: "available", champion: false, notes: "kept note" },
    { id: "w_2", name: "B", wins: 0, status: "used", champion: true, notes: "" },
  ];
  universe.formerWrestlers = { w_gone: "GONE" };
  return universe;
}

describe("exportFilename", () => {
  it("uses the local date as wwe-universe-YYYY-MM-DD.json", () => {
    expect(exportFilename(NOW)).toBe("wwe-universe-2026-11-02.json");
    expect(exportFilename(new Date(2027, 0, 5))).toBe("wwe-universe-2027-01-05.json");
  });
});

describe("serializeUniverse", () => {
  it("AC 1: produces valid JSON that passes validateUniverse", () => {
    const { filename, text } = serializeUniverse(sampleUniverse(), NOW);
    const parsed = JSON.parse(text);

    expect(filename).toBe("wwe-universe-2026-11-02.json");
    expect(validateUniverse(parsed)).toEqual([]);
    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.exportedAt).toBe(NOW.toISOString());
  });

  it("AC 2: contains every entity list, notes, settings and formerWrestlers when present", () => {
    const universe = sampleUniverse();
    universe.events = [
      {
        id: "e_1", type: "ambush", week: 1, participantIds: ["w_1", "w_2"], state: "proposed",
        seed: 1, deltas: [], description: "pending proposal", createdAt: NOW.toISOString(),
      },
    ];
    const parsed = JSON.parse(serializeUniverse(universe, NOW).text);

    for (const key of ["wrestlers", "matchResults", "events", "relationships", "factions", "storylines", "settings"]) {
      expect(parsed).toHaveProperty(key);
    }
    expect(parsed.wrestlers[0].notes).toBe("kept note");
    expect(parsed.events[0].state).toBe("proposed");
    expect(parsed.formerWrestlers).toEqual({ w_gone: "GONE" });
  });

  it("AC 2: omits formerWrestlers when it is empty", () => {
    const parsed = JSON.parse(serializeUniverse(createEmptyUniverse(), NOW).text);

    expect(parsed).not.toHaveProperty("formerWrestlers");
  });

  it("AC 3: exports an empty universe with empty arrays that still validates", () => {
    const parsed = JSON.parse(serializeUniverse(createEmptyUniverse(), NOW).text);

    for (const key of ["wrestlers", "matchResults", "events", "relationships", "factions", "storylines"]) {
      expect(parsed[key]).toEqual([]);
    }
    expect(validateUniverse(parsed)).toEqual([]);
  });

  it("AC 4: never writes aiEnabled or aiEndpoint, even when configured", () => {
    const universe = sampleUniverse();
    universe.settings = { ...universe.settings, aiEnabled: true, aiEndpoint: "https://example.com/ai" };

    const { text } = serializeUniverse(universe, NOW);
    const parsed = JSON.parse(text);

    expect(parsed.settings).not.toHaveProperty("aiEnabled");
    expect(parsed.settings).not.toHaveProperty("aiEndpoint");
    expect(text).not.toContain("example.com");
    expect(parsed.settings.autoPropose).toBe(true);
    expect(validateUniverse(parsed)).toEqual([]);
  });

  it("does not modify the universe it is given", () => {
    const universe = sampleUniverse();
    universe.settings.aiEndpoint = "https://example.com/ai";
    serializeUniverse(universe, NOW);

    expect(universe.settings.aiEndpoint).toBe("https://example.com/ai");
    expect(universe.formerWrestlers).toEqual({ w_gone: "GONE" });
  });
});
