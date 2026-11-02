import { describe, expect, it } from "vitest";
import wrestlersData from "../data/wrestlers.json";
import { createEmptyUniverse, validateUniverse, V2_KEY } from "./schema.js";
import { ensureCurrent, migrateLegacy } from "./migrate.js";

function makeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
  };
}

const FULL_ROSTER = [
  { name: "A", wins: 3, note: "*", status: "used", champion: false },
  { name: "B", wins: 0, note: "WILL RETURN", status: "title-shot", champion: false },
  { name: "C", wins: 12, note: "", status: "available", champion: true },
];

describe("migrateLegacy", () => {
  it("AC 1: converts every wrestler losslessly with new w_ ids and the legacy week", () => {
    const { universe, notice } = migrateLegacy(JSON.stringify(FULL_ROSTER), "7");
    expect(notice).toBeUndefined();
    expect(universe.week).toBe(7);
    expect(universe.wrestlers).toHaveLength(3);
    universe.wrestlers.forEach((w, i) => {
      expect(w.id).toMatch(/^w_/);
      expect(w).toMatchObject({
        name: FULL_ROSTER[i].name,
        wins: FULL_ROSTER[i].wins,
        status: FULL_ROSTER[i].status,
        champion: FULL_ROSTER[i].champion,
        notes: FULL_ROSTER[i].note,
      });
      expect(w.legacy).toBeUndefined();
    });
    expect(validateUniverse(universe)).toEqual([]);
  });

  it("AC 1: week falls back to 1 unless it is a positive integer", () => {
    for (const bad of [null, "", "0", "-2", "2.5", "abc"]) {
      expect(migrateLegacy("[]", bad).universe.week).toBe(1);
    }
  });

  it("handles an empty roster", () => {
    const { universe, notice } = migrateLegacy("[]", "3");
    expect(universe.wrestlers).toEqual([]);
    expect(universe.week).toBe(3);
    expect(notice).toBeUndefined();
  });

  it("AC 4: invalid JSON or a non-array gives an empty universe and a notice", () => {
    for (const raw of ["{not json", '{"a":1}', "null", "42"]) {
      const { universe, notice } = migrateLegacy(raw, "4");
      expect(universe.wrestlers).toEqual([]);
      expect(universe.week).toBe(4);
      expect(typeof notice).toBe("string");
    }
  });

  it("AC 5: duplicate names are both kept with distinct ids", () => {
    const raw = JSON.stringify([{ name: "X", wins: 1 }, { name: "X", wins: 2 }]);
    const { universe } = migrateLegacy(raw, null);
    expect(universe.wrestlers.map((w) => w.wins)).toEqual([1, 2]);
    expect(universe.wrestlers[0].id).not.toBe(universe.wrestlers[1].id);
  });

  it("AC 6: extra fields go under legacy and missing fields get defaults", () => {
    const raw = JSON.stringify([{ name: "X", brand: "RAW", tags: [1] }]);
    const [w] = migrateLegacy(raw, null).universe.wrestlers;
    expect(w).toMatchObject({ wins: 0, status: "available", champion: false, notes: "" });
    expect(w.legacy).toEqual({ brand: "RAW", tags: [1] });
  });

  it("AC 6: an unknown status becomes available and the original is kept in legacy.status", () => {
    const raw = JSON.stringify([{ name: "X", status: "Injured" }]);
    const [w] = migrateLegacy(raw, null).universe.wrestlers;
    expect(w.status).toBe("available");
    expect(w.legacy).toEqual({ status: "Injured" });
  });

  it("AC 6: invalid wins, champion and note values fall back to defaults", () => {
    const raw = JSON.stringify([{ name: "X", wins: -1, champion: "yes", note: 5 }]);
    const [w] = migrateLegacy(raw, null).universe.wrestlers;
    expect(w).toMatchObject({ wins: 0, champion: false, notes: "" });
  });

  it("skips entries without a string name and counts them in the notice", () => {
    const raw = JSON.stringify([{ name: "X" }, { wins: 2 }, null, "str"]);
    const { universe, notice } = migrateLegacy(raw, null);
    expect(universe.wrestlers.map((w) => w.name)).toEqual(["X"]);
    expect(notice).toContain("3 entries");
  });
});

describe("ensureCurrent", () => {
  const legacyStorage = () =>
    makeStorage({ wrestlers: JSON.stringify(FULL_ROSTER), currentWeek: "5" });

  it("AC 2: running twice changes nothing", () => {
    const storage = legacyStorage();
    const first = ensureCurrent(storage);
    const snapshot = new Map(storage.map);
    const second = ensureCurrent(storage);
    expect(second.universe).toEqual(first.universe);
    expect(second.universe.wrestlers.map((w) => w.id)).toEqual(
      first.universe.wrestlers.map((w) => w.id),
    );
    expect(storage.map).toEqual(snapshot);
  });

  it("AC 3: legacy keys are untouched and backups hold the same strings", () => {
    const storage = legacyStorage();
    const roster = storage.getItem("wrestlers");
    ensureCurrent(storage);
    expect(storage.getItem("wrestlers")).toBe(roster);
    expect(storage.getItem("currentWeek")).toBe("5");
    expect(storage.getItem("wrestlers.backup-v1")).toBe(roster);
    expect(storage.getItem("currentWeek.backup-v1")).toBe("5");
    expect(JSON.parse(storage.getItem(V2_KEY)).wrestlers).toHaveLength(3);
  });

  it("AC 3: existing backups are never overwritten and a missing week gets no backup", () => {
    const storage = makeStorage({
      wrestlers: "[]",
      "wrestlers.backup-v1": "older",
    });
    ensureCurrent(storage);
    expect(storage.getItem("wrestlers.backup-v1")).toBe("older");
    expect(storage.getItem("currentWeek.backup-v1")).toBeNull();
  });

  it("AC 4: corrupt legacy roster keeps the raw text in the backup and returns a notice", () => {
    const storage = makeStorage({ wrestlers: "{oops", currentWeek: "2" });
    const { universe, notice } = ensureCurrent(storage);
    expect(universe.wrestlers).toEqual([]);
    expect(universe.week).toBe(2);
    expect(typeof notice).toBe("string");
    expect(storage.getItem("wrestlers.backup-v1")).toBe("{oops");
    expect(storage.getItem("wrestlers")).toBe("{oops");
  });

  it("AC 7: first ever run seeds from data/wrestlers.json without backup or notice", () => {
    const storage = makeStorage();
    const { universe, notice } = ensureCurrent(storage);
    expect(notice).toBeUndefined();
    expect(universe.wrestlers).toHaveLength(wrestlersData.length);
    universe.wrestlers.forEach((w, i) => {
      expect(w).toMatchObject({
        name: wrestlersData[i].name,
        wins: wrestlersData[i].wins,
        notes: wrestlersData[i].note,
        status: wrestlersData[i].note === "*" ? "used" : "available",
        champion: false,
      });
    });
    expect([...storage.map.keys()]).toEqual([V2_KEY]);
  });

  it("AC 8: a valid v2 document is returned as is and legacy keys are ignored", () => {
    const doc = createEmptyUniverse();
    doc.week = 9;
    const storage = makeStorage({ [V2_KEY]: JSON.stringify(doc), wrestlers: "[]" });
    const result = ensureCurrent(storage);
    expect(result).toEqual({ universe: doc });
    expect(storage.getItem("wrestlers.backup-v1")).toBeNull();
  });

  it("AC 8: an invalid v2 document is not overwritten; notice and readOnly are returned", () => {
    const raw = '{"schemaVersion":2,"week":0}';
    const storage = makeStorage({ [V2_KEY]: raw, wrestlers: JSON.stringify(FULL_ROSTER) });
    const { universe, notice, readOnly } = ensureCurrent(storage);
    expect(universe.wrestlers).toEqual([]);
    expect(typeof notice).toBe("string");
    expect(readOnly).toBe(true);
    expect(storage.getItem(V2_KEY)).toBe(raw);
    expect(storage.getItem("wwe-universe-v2.invalid-backup")).toBe(raw);
    expect(storage.getItem("wrestlers.backup-v1")).toBeNull();
  });

  it("AC 8: a newer-version or unparsable v2 document is not overwritten", () => {
    for (const raw of [JSON.stringify({ schemaVersion: 3 }), "{broken"]) {
      const storage = makeStorage({ [V2_KEY]: raw });
      const result = ensureCurrent(storage);
      expect(result.readOnly).toBe(true);
      expect(result.notice).toBeTruthy();
      expect(storage.getItem(V2_KEY)).toBe(raw);
    }
  });

  it("the invalid-document backup is not overwritten on a second run", () => {
    const storage = makeStorage({ [V2_KEY]: "{broken", "wwe-universe-v2.invalid-backup": "first" });
    ensureCurrent(storage);
    expect(storage.getItem("wwe-universe-v2.invalid-backup")).toBe("first");
  });

  it("never throws when storage fails and says changes won't be saved", () => {
    const failingSet = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
    const failingGet = { getItem: () => { throw new Error("denied"); }, setItem: () => {} };
    for (const storage of [failingSet, failingGet]) {
      const { universe, notice } = ensureCurrent(storage);
      expect(universe.wrestlers.length).toBeGreaterThan(0);
      expect(notice).toContain("changes won't be saved");
    }
  });
});
