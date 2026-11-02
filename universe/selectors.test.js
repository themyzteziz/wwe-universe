import { createEmptyUniverse } from "./schema";
import { timelineEntries } from "./selectors";

const wrestler = (id, name) => ({
  id,
  name,
  status: "available",
  wins: 0,
  champion: false,
  notes: "",
});

const match = (id, week, recordedAt, participantIds, winnerIds) => ({
  id,
  week,
  type: "1v1",
  participantIds,
  winnerIds,
  recordedAt,
});

const event = (id, week, createdAt, participantIds, state, type = "ambush") => ({
  id,
  type,
  week,
  participantIds,
  state,
  seed: 1,
  deltas: [],
  description: `${id} text`,
  createdAt,
});

function universe() {
  const u = createEmptyUniverse();
  u.wrestlers = [wrestler("w_1", "ALPHA"), wrestler("w_2", "BETA"), wrestler("w_3", "GAMMA")];
  u.matchResults = [
    match("m_1", 1, "2026-01-01T10:00:00.000Z", ["w_1", "w_2"], ["w_1"]),
    match("m_2", 2, "2026-01-02T10:00:00.000Z", ["w_2", "w_3"], ["w_3"]),
  ];
  u.events = [
    event("e_1", 1, "2026-01-01T11:00:00.000Z", ["w_1", "w_2"], "accepted"),
    event("e_2", 2, "2026-01-02T11:00:00.000Z", ["w_2", "w_3"], "rejected", "respect"),
    event("e_3", 3, "2026-01-03T11:00:00.000Z", ["w_1", "w_3"], "proposed"),
  ];
  return u;
}

const ids = (entries) => entries.map((e) => e.id);

describe("timelineEntries", () => {
  it("AC 1: sorts newest first by default and oldest first for asc", () => {
    const u = universe();

    expect(ids(timelineEntries(u))).toEqual(["m_2", "e_1", "m_1"]);
    expect(ids(timelineEntries(u, { order: "asc" }))).toEqual(["m_1", "e_1", "m_2"]);
  });

  it("AC 1: orders the same week by createdAt, then by id", () => {
    const u = createEmptyUniverse();
    u.wrestlers = [wrestler("w_1", "ALPHA"), wrestler("w_2", "BETA")];
    u.matchResults = [
      match("m_b", 4, "2026-01-01T10:00:00.000Z", ["w_1", "w_2"], ["w_1"]),
      match("m_a", 4, "2026-01-01T10:00:00.000Z", ["w_1", "w_2"], ["w_2"]),
      match("m_c", 4, "2026-01-01T09:00:00.000Z", ["w_1", "w_2"], ["w_1"]),
    ];

    expect(ids(timelineEntries(u, { order: "asc" }))).toEqual(["m_c", "m_a", "m_b"]);
    expect(ids(timelineEntries(u))).toEqual(["m_b", "m_a", "m_c"]);
  });

  it("builds match lines from names and shows 'Unknown wrestler' for unknown ids", () => {
    const u = universe();
    u.matchResults[0] = match("m_1", 1, "2026-01-01T10:00:00.000Z", ["w_1", "w_x"], ["w_1"]);

    const entry = timelineEntries(u, { order: "asc" })[0];

    expect(entry).toMatchObject({
      kind: "match",
      description: "ALPHA def. Unknown wrestler",
      createdAt: "2026-01-01T10:00:00.000Z",
      dimmed: false,
    });
  });

  it("AC 2: wrestlerId keeps only entries that include that wrestler", () => {
    const u = universe();

    expect(ids(timelineEntries(u, { wrestlerId: "w_1" }))).toEqual(["e_1", "m_1"]);
    expect(ids(timelineEntries(u, { wrestlerId: "w_3", showRejected: true }))).toEqual([
      "e_2",
      "m_2",
    ]);
  });

  it("AC 3: hides rejected by default and shows them dimmed with showRejected", () => {
    const u = universe();

    expect(ids(timelineEntries(u))).not.toContain("e_2");

    const shown = timelineEntries(u, { showRejected: true });

    expect(shown.find((e) => e.id === "e_2")).toMatchObject({ state: "rejected", dimmed: true });
    expect(shown.find((e) => e.id === "e_1").dimmed).toBe(false);
  });

  it("never includes proposed events", () => {
    expect(ids(timelineEntries(universe(), { showRejected: true }))).not.toContain("e_3");
  });

  it("filters by inclusive week range", () => {
    const u = universe();

    expect(ids(timelineEntries(u, { weekFrom: 2, weekTo: 2, showRejected: true }))).toEqual([
      "e_2",
      "m_2",
    ]);
    expect(ids(timelineEntries(u, { weekFrom: 2 }))).toEqual(["m_2"]);
    expect(ids(timelineEntries(u, { weekTo: 1, order: "asc" }))).toEqual(["m_1", "e_1"]);
  });

  it("eventType hides match entries and other event types", () => {
    const u = universe();

    expect(ids(timelineEntries(u, { eventType: "ambush" }))).toEqual(["e_1"]);
    expect(ids(timelineEntries(u, { eventType: "respect" }))).toEqual([]);
  });

  it("states filters event state only", () => {
    const u = universe();

    expect(
      ids(timelineEntries(u, { states: new Set(["rejected"]), showRejected: true }))
    ).toEqual(["e_2", "m_2", "m_1"]);
  });

  it("AC 4: returns an empty list for an empty universe", () => {
    expect(timelineEntries(createEmptyUniverse())).toEqual([]);
  });

  it("AC 6: handles 500 entries", () => {
    const u = createEmptyUniverse();
    u.wrestlers = [wrestler("w_1", "ALPHA"), wrestler("w_2", "BETA")];
    u.matchResults = Array.from({ length: 500 }, (_, i) =>
      match(`m_${i}`, i + 1, `2026-01-01T00:00:${String(i % 60).padStart(2, "0")}.000Z`, ["w_1", "w_2"], ["w_1"])
    );

    const entries = timelineEntries(u);

    expect(entries).toHaveLength(500);
    expect(entries[0].week).toBe(500);
    expect(entries[499].week).toBe(1);
  });
});
