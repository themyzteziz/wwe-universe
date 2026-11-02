// @vitest-environment jsdom
import { useEffect } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App.jsx";
import { reducer, UniverseProvider, useUniverse } from "./UniverseContext.jsx";
import { createEmptyUniverse, V2_KEY } from "./schema";

const captured = {};

function Capture() {
  const ctx = useUniverse();

  useEffect(() => {
    captured.ctx = ctx;
  });

  return (
    <ul>
      {ctx.universe.wrestlers.map((wrestler) => (
        <li key={wrestler.id}>{wrestler.name}</li>
      ))}
    </ul>
  );
}

function wrestler(id, name, extra = {}) {
  return { id, name, wins: 0, status: "available", champion: false, notes: "", ...extra };
}

function universeWith(wrestlers) {
  return { ...createEmptyUniverse(), wrestlers };
}

function stateOf(universe, extra = {}) {
  return { universe, readOnly: false, notice: null, saveError: null, banners: [], ...extra };
}

function storeUniverse(universe) {
  localStorage.setItem(V2_KEY, JSON.stringify(universe));
}

function stored() {
  return JSON.parse(localStorage.getItem(V2_KEY));
}

function mount() {
  return render(
    <UniverseProvider>
      <Capture />
    </UniverseProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("reducer (AC 4)", () => {
  const base = universeWith([wrestler("w_1", "ALPHA", { wins: 1 }), wrestler("w_2", "BETA")]);
  const run = (action, state = stateOf(base)) => reducer(state, action).universe;

  it("addWrestler trims, uppercases and ignores case-insensitive duplicates", () => {
    const added = run({ type: "addWrestler", name: "  gamma ", id: "w_3" });
    expect(added.wrestlers.at(-1)).toEqual(wrestler("w_3", "GAMMA"));
    expect(run({ type: "addWrestler", name: "alpha", id: "w_4" })).toBe(base);
    expect(run({ type: "addWrestler", name: "  ", id: "w_5" })).toBe(base);
  });

  it("removeWrestler writes a tombstone and keeps relationships", () => {
    const withRel = { ...base, relationships: [{ fromId: "w_1", toId: "w_2", score: 0, state: "neutral", history: [] }] };
    const removed = run({ type: "removeWrestler", id: "w_2" }, stateOf(withRel));
    expect(removed.wrestlers.map((w) => w.id)).toEqual(["w_1"]);
    expect(removed.formerWrestlers).toEqual({ w_2: "BETA" });
    expect(removed.relationships).toHaveLength(1);
  });

  it("setNotes, changeWins (min 0), cycleStatus, toggleChampion and setWeek", () => {
    expect(run({ type: "setNotes", id: "w_1", notes: "hi" }).wrestlers[0].notes).toBe("hi");
    expect(run({ type: "changeWins", id: "w_1", amount: 1 }).wrestlers[0].wins).toBe(2);
    expect(run({ type: "changeWins", id: "w_2", amount: -1 }).wrestlers[1].wins).toBe(0);

    let u = base;
    const seen = [];
    for (let i = 0; i < 3; i++) {
      u = run({ type: "cycleStatus", id: "w_1" }, stateOf(u));
      seen.push(u.wrestlers[0].status);
    }
    expect(seen).toEqual(["title-shot", "used", "available"]);

    expect(run({ type: "toggleChampion", id: "w_1" }).wrestlers[0].champion).toBe(true);
    expect(run({ type: "setWeek", week: 5 }).week).toBe(5);
    expect(run({ type: "setWeek", week: 0 })).toBe(base);
  });

  it("unknown ids are no-ops", () => {
    expect(run({ type: "setNotes", id: "nope", notes: "x" })).toBe(base);
  });
});

describe("UniverseProvider", () => {
  it("AC 1: loads the seeded roster through useUniverse and writes the v2 document once", () => {
    mount();
    expect(captured.ctx.universe.wrestlers.length).toBeGreaterThan(0);
    expect(stored().schemaVersion).toBe(2);
  });

  it("AC 1: shows a dismissible migration notice", () => {
    localStorage.setItem("wrestlers", "{not json");
    mount();
    expect(captured.ctx.banners.some((b) => b.id === "notice")).toBe(true);
    act(() => captured.ctx.dismissNotice());
    expect(captured.ctx.banners.some((b) => b.id === "notice")).toBe(false);
  });

  it("AC 2: autosaves within 300 ms and survives a remount with the same id", () => {
    storeUniverse(universeWith([wrestler("w_1", "ALPHA")]));
    const first = mount();
    act(() => captured.ctx.dispatch({ type: "addWrestler", name: "beta", id: "w_new" }));

    act(() => vi.advanceTimersByTime(299));
    expect(stored().wrestlers).toHaveLength(1);
    act(() => vi.advanceTimersByTime(1));
    expect(stored().wrestlers.map((w) => w.id)).toEqual(["w_1", "w_new"]);

    first.unmount();
    mount();
    expect(captured.ctx.universe.wrestlers.map((w) => w.id)).toContain("w_new");
  });

  it("AC 3: a throwing setItem keeps the app working and shows a warning", () => {
    storeUniverse(universeWith([wrestler("w_1", "ALPHA")]));
    mount();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    act(() => captured.ctx.dispatch({ type: "addWrestler", name: "beta", id: "w_2" }));
    act(() => vi.advanceTimersByTime(300));

    expect(captured.ctx.saveError).toMatch(/may not be saved/);
    expect(captured.ctx.banners.find((b) => b.id === "storage").kind).toBe("warning");
    expect(captured.ctx.universe.wrestlers).toHaveLength(2);
  });

  it("AC 5: read-only mode warns, never writes, and replaceUniverse(confirmed) clears it", () => {
    localStorage.setItem(V2_KEY, "{broken");
    mount();
    expect(captured.ctx.readOnly).toBe(true);
    expect(captured.ctx.banners.some((b) => b.kind === "warning")).toBe(true);

    act(() => captured.ctx.dispatch({ type: "addWrestler", name: "beta", id: "w_2" }));
    act(() => vi.advanceTimersByTime(300));
    expect(captured.ctx.universe.wrestlers).toHaveLength(0);
    expect(localStorage.getItem(V2_KEY)).toBe("{broken");

    const replacement = universeWith([wrestler("w_9", "NINE")]);
    act(() => captured.ctx.dispatch({ type: "replaceUniverse", universe: replacement, confirmed: false }));
    act(() => vi.advanceTimersByTime(300));
    expect(localStorage.getItem(V2_KEY)).toBe("{broken");

    act(() => captured.ctx.dispatch({ type: "replaceUniverse", universe: replacement, confirmed: true }));
    expect(captured.ctx.readOnly).toBe(false);
    act(() => vi.advanceTimersByTime(300));
    expect(stored().wrestlers.map((w) => w.id)).toEqual(["w_9"]);
  });

  it("replaceUniverse rejects an invalid document and forces AI off", () => {
    storeUniverse(universeWith([wrestler("w_1", "ALPHA")]));
    mount();
    act(() => captured.ctx.dispatch({ type: "replaceUniverse", universe: { schemaVersion: 1 }, confirmed: true }));
    expect(captured.ctx.universe.wrestlers).toHaveLength(1);

    const ai = universeWith([]);
    ai.settings = { ...ai.settings, aiEnabled: true };
    act(() => captured.ctx.dispatch({ type: "replaceUniverse", universe: ai, confirmed: true }));
    expect(captured.ctx.universe.settings.aiEnabled).toBe(false);
  });

  it("AC 6: unmount flushes a pending save", () => {
    storeUniverse(universeWith([wrestler("w_1", "ALPHA")]));
    const view = mount();
    act(() => captured.ctx.dispatch({ type: "addWrestler", name: "beta", id: "w_2" }));
    expect(stored().wrestlers).toHaveLength(1);
    view.unmount();
    expect(stored().wrestlers).toHaveLength(2);
  });

  it("AC 6: pagehide flushes a pending save", () => {
    storeUniverse(universeWith([wrestler("w_1", "ALPHA")]));
    mount();
    act(() => captured.ctx.dispatch({ type: "addWrestler", name: "beta", id: "w_2" }));
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(stored().wrestlers).toHaveLength(2);
  });
});

describe("App through the store (AC 4)", () => {
  it("adds an uppercase wrestler, rejects duplicates, bumps the week and removes with confirm", () => {
    storeUniverse(universeWith([wrestler("w_1", "ALPHA")]));
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <UniverseProvider>
        <App />
      </UniverseProvider>
    );

    fireEvent.click(screen.getByText("Next ▶"));
    expect(screen.getByText("Week 2")).toBeTruthy();

    fireEvent.click(screen.getByText("WRESTLERS"));
    const input = screen.getByPlaceholderText("Wrestler name");

    fireEvent.change(input, { target: { value: "beta" } });
    fireEvent.click(screen.getByText("Add Wrestler"));
    expect(screen.getByText("BETA")).toBeTruthy();

    fireEvent.change(input, { target: { value: "Alpha" } });
    fireEvent.click(screen.getByText("Add Wrestler"));
    expect(alertSpy).toHaveBeenCalledWith("That wrestler already exists.");

    fireEvent.click(screen.getAllByText("Remove")[0]);
    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.queryByText("ALPHA")).toBeNull();
  });
});
