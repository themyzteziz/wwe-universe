// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RelationshipProfile from "./RelationshipProfile.jsx";
import WrestlerPicker from "./WrestlerPicker.jsx";
import { reducer, UniverseProvider } from "../../universe/UniverseContext.jsx";
import { applyDelta } from "../../universe/relationships.js";
import { createEmptyUniverse, V2_KEY } from "../../universe/schema.js";

const fixture = { universe: null };

vi.mock("../../universe/UniverseContext.jsx", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    useUniverse: () => (fixture.universe ? { universe: fixture.universe } : actual.useUniverse()),
  };
});

const wrestler = (id, name, extra = {}) => ({
  id,
  name,
  wins: 0,
  status: "available",
  champion: false,
  notes: "",
  ...extra,
});

const give = (universe, toId, delta, week, reason, extra = {}) =>
  applyDelta(universe, {
    fromId: "w_a",
    toId,
    delta,
    source: { week, reason, ...extra },
  });

function build() {
  let u = {
    ...createEmptyUniverse(),
    wrestlers: [
      wrestler("w_a", "ALPHA", { notes: "Booked as a heel." }),
      wrestler("w_b", "BRAVO"),
      wrestler("w_c", "CHARLIE"),
      wrestler("w_d", "DELTA"),
      wrestler("w_e", "ECHO"),
      wrestler("w_f", "FOXTROT"),
    ],
  };

  u = give(u, "w_b", 30, 1, "Saved from an attack", { eventId: "e_1" });
  u = give(u, "w_c", 50, 2, "Tag win");
  u = give(u, "w_d", -30, 1, "Ambushed", { matchId: "m_9" });
  u = give(u, "w_e", -70, 3, "Betrayal");
  u = give(u, "w_f", 10, 1, "Handshake");
  u = give(u, "w_f", -10, 2, "Argument");
  u = give(u, "w_b", 10, 3, "Second help");

  return u;
}

const show = (universe, id = "w_a") => {
  fixture.universe = universe;

  return render(<RelationshipProfile wrestlerId={id} />);
};

const historyOf = (toId) =>
  [...document.getElementById(`history-w_a>${toId}`).querySelectorAll("li")].map(
    (li) => li.textContent
  );

beforeEach(() => {
  fixture.universe = null;
  localStorage.clear();
});

afterEach(cleanup);

describe("RelationshipProfile", () => {
  it("AC 1: groups by state in order, sorts by |score| and shows badges", () => {
    show(build());

    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(["Allies", "Rivals", "Enemies", "Neutral", "Notes"]);

    const allies = within(screen.getByRole("heading", { name: "Allies" }).parentElement);
    const names = allies.getAllByRole("button").map((b) => b.textContent);
    expect(names).toEqual(["CHARLIE+50Ally", "BRAVO+40Ally"]);

    const enemies = within(screen.getByRole("heading", { name: "Enemies" }).parentElement);
    expect(enemies.getByText("Enemy")).toBeInTheDocument();
    expect(enemies.getByText("-70")).toBeInTheDocument();
  });

  it("AC 1: hides empty sections", () => {
    const u = give(
      { ...createEmptyUniverse(), wrestlers: [wrestler("w_a", "ALPHA"), wrestler("w_b", "BRAVO")] },
      "w_b",
      30,
      1,
      "Help"
    );
    show(u);

    expect(screen.getByRole("heading", { name: "Allies" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Rivals" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Enemies" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Neutral" })).not.toBeInTheDocument();
  });

  it("AC 1: shows a neutral relationship whose deltas cancelled out", () => {
    show(build());

    const neutral = within(screen.getByRole("heading", { name: "Neutral" }).parentElement);
    expect(neutral.getByRole("button", { name: /FOXTROT.*0.*Neutral/ })).toBeInTheDocument();
  });

  it("AC 1: omits a neutral relationship with an empty history", () => {
    show({
      ...createEmptyUniverse(),
      wrestlers: [wrestler("w_a", "ALPHA"), wrestler("w_b", "BRAVO")],
      relationships: [{ fromId: "w_a", toId: "w_b", score: 0, state: "neutral", history: [] }],
    });

    expect(screen.queryByRole("heading", { name: "Neutral" })).not.toBeInTheDocument();
    expect(screen.getByText("No history yet")).toBeInTheDocument();
  });

  it("AC 2: expanding a row shows oldest-first history with signed delta, reason and link", async () => {
    show(build());

    const row = screen.getByRole("button", { name: /BRAVO/ });
    expect(row).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("history-w_a>w_b")).toBeNull();

    await userEvent.click(row);
    expect(row).toHaveAttribute("aria-expanded", "true");

    const text = historyOf("w_b");
    expect(text).toHaveLength(2);
    expect(text[0]).toContain("Week 1");
    expect(text[0]).toContain("+30");
    expect(text[0]).toContain("Saved from an attack");
    expect(text[0]).toContain("Event e_1");
    expect(text[1]).toContain("Week 3");
    expect(text[1]).toContain("+10");

    await userEvent.click(row);
    expect(row).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("history-w_a>w_b")).toBeNull();
  });

  it("AC 2: sorts history oldest first even when stored out of order", async () => {
    const u = build();
    show({
      ...u,
      relationships: u.relationships.map((r) =>
        r.toId === "w_b" ? { ...r, history: [...r.history].reverse() } : r
      ),
    });

    await userEvent.click(screen.getByRole("button", { name: /BRAVO/ }));

    const text = historyOf("w_b");
    expect(text[0]).toContain("Week 1");
    expect(text[1]).toContain("Week 3");
  });

  it("AC 2: shows a match link label and negative deltas", async () => {
    show(build());

    await userEvent.click(screen.getByRole("button", { name: /DELTA/ }));

    expect(historyOf("w_d")[0]).toContain("-30");
    expect(historyOf("w_d")[0]).toContain("Match m_9");
  });

  it("AC 3: a wrestler without relationships shows 'No history yet'", () => {
    show(build(), "w_b");

    expect(screen.getByText("No history yet")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Allies" })).not.toBeInTheDocument();
  });

  it("AC 3: an empty roster shows 'No wrestlers yet'", () => {
    show(createEmptyUniverse(), undefined);

    expect(screen.getByText("No wrestlers yet")).toBeInTheDocument();
  });

  it("AC 4: shows the current name after a rename", () => {
    const u = build();
    const { rerender } = show(u);
    expect(screen.getByRole("button", { name: /BRAVO/ })).toBeInTheDocument();

    fixture.universe = {
      ...u,
      wrestlers: u.wrestlers.map((w) => (w.id === "w_b" ? { ...w, name: "BRAVO PRIME" } : w)),
    };
    rerender(<RelationshipProfile wrestlerId="w_a" />);

    expect(screen.getByRole("button", { name: /BRAVO PRIME/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^BRAVO\+/ })).not.toBeInTheDocument();
  });

  it("AC 4: a removed counterpart keeps its last name with a (former) suffix", () => {
    const { universe } = reducer(
      { universe: build(), readOnly: false, notice: null, saveError: null, banners: [] },
      { type: "removeWrestler", id: "w_b" }
    );
    show(universe);

    expect(screen.getByRole("button", { name: /BRAVO \(former\)/ })).toBeInTheDocument();
  });

  it("AC 5: content is identical after reload from the stored universe", () => {
    localStorage.setItem(V2_KEY, JSON.stringify(build()));

    const first = render(
      <UniverseProvider>
        <RelationshipProfile wrestlerId="w_a" />
      </UniverseProvider>
    );
    const before = first.container.innerHTML;
    first.unmount();

    const second = render(
      <UniverseProvider>
        <RelationshipProfile wrestlerId="w_a" />
      </UniverseProvider>
    );

    expect(before).toContain("CHARLIE");
    expect(second.container.innerHTML).toBe(before);
  });

  it("AC 6: notes appear in their own block, not in the history", async () => {
    show(build());

    const notes = screen.getByRole("heading", { name: "Notes" }).parentElement;
    expect(notes).toHaveTextContent("Booked as a heel.");

    await userEvent.click(screen.getByRole("button", { name: /BRAVO/ }));
    expect(document.getElementById("history-w_a>w_b")).not.toHaveTextContent("Booked as a heel.");
    expect(screen.getAllByText("Booked as a heel.")).toHaveLength(1);
  });

  it("AC 7: the only controls are the expand buttons", () => {
    show(build());

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(5);
    buttons.forEach((b) => expect(b).toHaveAttribute("aria-expanded"));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });
});

describe("WrestlerPicker", () => {
  it("lists wrestlers sorted by name and reports the selected id", async () => {
    const onChange = vi.fn();
    render(
      <WrestlerPicker
        wrestlers={[wrestler("w_2", "ZED"), wrestler("w_1", "ABE")]}
        value="w_1"
        onChange={onChange}
      />
    );

    const select = screen.getByRole("combobox", { name: "Wrestler" });
    expect([...select.options].map((o) => o.textContent)).toEqual(["ABE", "ZED"]);

    await userEvent.selectOptions(select, "w_2");
    expect(onChange).toHaveBeenCalledWith("w_2");
  });
});
