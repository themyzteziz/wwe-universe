import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../App";
import { serializeUniverse, PRE_IMPORT_KEY } from "../../universe/exportImport";
import { createEmptyUniverse, V2_KEY } from "../../universe/schema";
import { reducer, SAVE_DELAY_MS, UniverseProvider, useUniverse } from "../../universe/UniverseContext";
import BackupPanel from "./BackupPanel";

const captured = {};

function Capture() {
  const ctx = useUniverse();

  useEffect(() => {
    captured.ctx = ctx;
  });

  return (
    <ul>
      {ctx.banners.map((banner) => (
        <li key={banner.id}>{banner.text}</li>
      ))}
    </ul>
  );
}

function wrestler(id, name) {
  return { id, name, status: "available", wins: 0, champion: false, notes: "" };
}

function universeOf(names, extra = {}) {
  return {
    ...createEmptyUniverse(),
    wrestlers: names.map((name) => wrestler(`w_${name}`, name)),
    ...extra,
  };
}

function accepted(id, description) {
  return {
    id,
    type: "respect",
    week: 2,
    participantIds: [],
    state: "accepted",
    seed: 1,
    deltas: [],
    description,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

const store = (universe) => localStorage.setItem(V2_KEY, JSON.stringify(universe));
const stored = () => JSON.parse(localStorage.getItem(V2_KEY));
const fileOf = (universe) => new File([serializeUniverse(universe).text], "backup.json");

function mount(ui = <BackupPanel />) {
  return render(
    <UniverseProvider>
      <Capture />
      {ui}
    </UniverseProvider>
  );
}

async function chooseFile(file) {
  await userEvent.upload(screen.getByLabelText("Backup file"), file);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AC 2: confirm", () => {
  it("names the wrestlers and events being replaced and imported", async () => {
    store(universeOf(["A", "B"], { events: [accepted("e_1", "x")] }));
    mount();

    await chooseFile(fileOf(universeOf(["C"])));

    expect(
      await screen.findByText(
        "Replace current universe (2 wrestlers, 1 events) with file (1 wrestlers, 0 events)?"
      )
    ).toBeInTheDocument();
    expect(stored().wrestlers).toHaveLength(2);
  });

  it("cancel leaves everything unchanged and writes no snapshot", async () => {
    store(universeOf(["A"]));
    mount();

    await chooseFile(fileOf(universeOf(["C"])));
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(captured.ctx.universe.wrestlers.map((w) => w.name)).toEqual(["A"]);
    expect(localStorage.getItem(PRE_IMPORT_KEY)).toBeNull();
  });

  it("resets the file input after each attempt", async () => {
    mount();
    const input = screen.getByLabelText("Backup file");

    await chooseFile(new File(["{nope"], "bad.json"));
    await screen.findByRole("alert");

    expect(input.value).toBe("");
  });
});

describe("AC 1 and AC 4: round trip into the app", () => {
  it("replaces the universe and the timeline shows the imported entries", async () => {
    const file = fileOf(universeOf(["A", "B"], { events: [accepted("e_1", "A and B shook hands.")] }));
    render(
      <UniverseProvider>
        <App />
      </UniverseProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "UNIVERSE" }));
    await userEvent.click(screen.getByRole("tab", { name: "Backup" }));
    await chooseFile(file);
    await userEvent.click(await screen.findByRole("button", { name: "Replace universe" }));
    await userEvent.click(screen.getByRole("tab", { name: "Timeline" }));

    expect(await screen.findByText("A and B shook hands.")).toBeInTheDocument();
    await waitFor(() => expect(stored().wrestlers.map((w) => w.name)).toEqual(["A", "B"]));
    expect(stored().settings).toMatchObject({ aiEnabled: false, aiEndpoint: "" });
  });
});

describe("AC 3: invalid", () => {
  it("lists the problems and changes nothing", async () => {
    store(universeOf(["A"]));
    const before = localStorage.getItem(V2_KEY);
    mount();

    await chooseFile(new File(["{nope"], "bad.json"));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("File is not valid JSON.")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(localStorage.getItem(V2_KEY)).toBe(before);
    expect(localStorage.getItem(PRE_IMPORT_KEY)).toBeNull();
  });

  it("shows at most 20 problems and then 'and N more'", async () => {
    const events = Array.from({ length: 25 }, (_, i) => ({
      ...accepted(`e_${i}`, "x"),
      participantIds: ["w_ghost"],
    }));
    mount();

    await chooseFile(fileOf(universeOf([], { events })));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getAllByRole("listitem")).toHaveLength(21);
    expect(within(alert).getByText("and 5 more")).toBeInTheDocument();
  });
});

describe("AC 5: pre-import backup", () => {
  it("flushes the pending save and keeps the prior raw document", async () => {
    store(universeOf(["A"]));
    mount();

    // The debounced save never fires on its own, so only the flush can write the change.
    const realSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, "setTimeout").mockImplementation((fn, ms, ...args) =>
      ms === SAVE_DELAY_MS ? 0 : realSetTimeout(fn, ms, ...args)
    );
    act(() => captured.ctx.dispatch({ type: "addWrestler", name: "pending", id: "w_pending" }));
    expect(stored().wrestlers).toHaveLength(1);

    await chooseFile(fileOf(universeOf(["C"])));
    await userEvent.click(await screen.findByRole("button", { name: "Replace universe" }));

    const snapshot = JSON.parse(localStorage.getItem(PRE_IMPORT_KEY));
    expect(snapshot.wrestlers.map((w) => w.name)).toEqual(["A", "PENDING"]);
    expect(captured.ctx.universe.wrestlers.map((w) => w.name)).toEqual(["C"]);
  });
});

describe("AC 6: AI settings are never imported", () => {
  it("a hostile file leaves AI off with an empty endpoint", async () => {
    const hostile = JSON.parse(serializeUniverse(universeOf(["A"])).text);
    hostile.settings.aiEnabled = true;
    hostile.settings.aiEndpoint = "https://evil.example";
    mount();

    await chooseFile(new File([JSON.stringify(hostile)], "hostile.json"));
    await userEvent.click(await screen.findByRole("button", { name: "Replace universe" }));

    expect(captured.ctx.universe.settings).toMatchObject({ aiEnabled: false, aiEndpoint: "" });
  });

  it("the reducer applies the same rule when replaceUniverse is dispatched directly", () => {
    const state = { universe: universeOf(["A"]), readOnly: false, notice: null, saveError: null, banners: [] };
    const universe = universeOf(["B"]);
    universe.settings = { ...universe.settings, aiEnabled: true, aiEndpoint: "https://evil.example" };

    const next = reducer(state, { type: "replaceUniverse", universe, confirmed: true });

    expect(next.universe.wrestlers[0].name).toBe("B");
    expect(next.universe.settings).toMatchObject({ aiEnabled: false, aiEndpoint: "" });

    universe.settings.aiEndpoint = "http://not-https.example";
    expect(reducer(state, { type: "replaceUniverse", universe, confirmed: true })).toBe(state);
  });
});

describe("AC 7: recovers from read-only mode", () => {
  it("replaces an unreadable document, ends read-only mode and resumes autosave", async () => {
    localStorage.setItem(V2_KEY, "{broken");
    mount();
    expect(captured.ctx.readOnly).toBe(true);

    await chooseFile(fileOf(universeOf(["C"])));
    expect(await screen.findByText(/Replace the unreadable saved universe/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Replace universe" }));

    expect(localStorage.getItem(PRE_IMPORT_KEY)).toBe("{broken");
    expect(captured.ctx.readOnly).toBe(false);
    expect(captured.ctx.banners.some((banner) => banner.id === "readOnly")).toBe(false);
    await waitFor(() => expect(stored().wrestlers.map((w) => w.name)).toEqual(["C"]));

    act(() => captured.ctx.dispatch({ type: "addWrestler", name: "later", id: "w_later" }));
    await waitFor(() => expect(stored().wrestlers).toHaveLength(2));
  });
});

describe("AC 8: snapshot cannot be stored", () => {
  function failSnapshotOnly() {
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (key, value) {
      if (key === PRE_IMPORT_KEY) throw new Error("quota");
      return original.call(this, key, value);
    });
  }

  it("asks a second time; cancel changes nothing", async () => {
    store(universeOf(["A"]));
    const before = localStorage.getItem(V2_KEY);
    mount();
    failSnapshotOnly();

    await chooseFile(fileOf(universeOf(["C"])));
    await userEvent.click(await screen.findByRole("button", { name: "Replace universe" }));

    expect(await screen.findByText(/No safety copy.*Export your universe first/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(captured.ctx.universe.wrestlers.map((w) => w.name)).toEqual(["A"]);
    expect(localStorage.getItem(V2_KEY)).toBe(before);
  });

  it("imports anyway when confirmed", async () => {
    store(universeOf(["A"]));
    mount();
    failSnapshotOnly();

    await chooseFile(fileOf(universeOf(["C"])));
    await userEvent.click(await screen.findByRole("button", { name: "Replace universe" }));
    await userEvent.click(await screen.findByRole("button", { name: "Import anyway" }));

    expect(captured.ctx.universe.wrestlers.map((w) => w.name)).toEqual(["C"]);
    expect(localStorage.getItem(PRE_IMPORT_KEY)).toBeNull();
  });
});

describe("export", () => {
  it("downloads the in-memory universe and revokes the object URL", async () => {
    store(universeOf(["A"]));
    mount();
    URL.createObjectURL = vi.fn(() => "blob:test");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    await userEvent.click(screen.getByRole("button", { name: "Export" }));

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });

  it("shows a failure banner when the download fails", async () => {
    mount();
    URL.createObjectURL = vi.fn(() => {
      throw new Error("no blob");
    });

    await userEvent.click(screen.getByRole("button", { name: "Export" }));

    expect(await screen.findByText("Export failed – try again")).toBeInTheDocument();
  });
});
