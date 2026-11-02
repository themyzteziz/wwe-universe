// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProposalCard from "./ProposalCard.jsx";
import { reducer } from "../../universe/UniverseContext.jsx";
import { createEmptyUniverse } from "../../universe/schema.js";

const fixture = { universe: null, dispatch: vi.fn(), readOnly: false, lastRoll: null };

vi.mock("../../universe/UniverseContext.jsx", async (importOriginal) => {
  const actual = await importOriginal();

  return { ...actual, useUniverse: () => ({ ...fixture }) };
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

const suggestion = (extra = {}) => ({
  id: "g_1",
  wrestlerId: "w_a",
  status: "title-shot",
  reason: "Built momentum in the feud with BRAVO",
  state: "pending",
  ...extra,
});

const ambush = (extra = {}) => ({
  id: "e_1",
  type: "ambush",
  week: 3,
  participantIds: ["w_a", "w_b"],
  state: "proposed",
  seed: 1,
  rerollCount: 0,
  description: "ALPHA attacks BRAVO from behind.",
  deltas: [
    { fromId: "w_b", toId: "w_a", delta: -27, applied: -27, scoreBefore: -35, scoreAfter: -62 },
    { fromId: "w_a", toId: "w_b", delta: -10, applied: -10, scoreBefore: 0, scoreAfter: -10 },
  ],
  suggestions: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  ...extra,
});

function build(events = [], extra = {}) {
  return {
    ...createEmptyUniverse(),
    wrestlers: [wrestler("w_a", "ALPHA"), wrestler("w_b", "BRAVO")],
    relationships: [
      { fromId: "w_b", toId: "w_a", score: -35, state: "rival", history: [] },
    ],
    events,
    ...extra,
  };
}

const show = (universe, extra = {}) => {
  Object.assign(fixture, { universe, readOnly: false, lastRoll: null, ...extra });

  return render(<ProposalCard />);
};

beforeEach(() => {
  fixture.dispatch = vi.fn();
});

afterEach(cleanup);

describe("ProposalCard", () => {
  it("AC 1: shows type, tier, description, affected wrestlers, deltas and the notice", () => {
    show(build([ambush()]));

    expect(screen.getByRole("heading", { name: "Ambush" })).toBeInTheDocument();
    expect(screen.getByText("Uncommon")).toBeInTheDocument();
    expect(screen.getByText("ALPHA attacks BRAVO from behind.")).toBeInTheDocument();
    expect(screen.getByText("Affected wrestlers:").parentElement).toHaveTextContent(
      "Affected wrestlers: ALPHA, BRAVO"
    );
    expect(screen.getByText("BRAVO → ALPHA: Rival (−35) → Enemy (−62)")).toBeInTheDocument();
    expect(screen.getByText("ALPHA → BRAVO: Neutral (0) → Neutral (−10)")).toBeInTheDocument();
    expect(
      screen.getByText("Wins, titles and title shots are not affected")
    ).toBeInTheDocument();
  });

  it("AC 1: prefers the tier stored on the event and falls back to Common", () => {
    const { unmount } = show(build([ambush({ tier: "rare" })]));
    expect(screen.getByText("Rare")).toBeInTheDocument();
    unmount();

    show(build([ambush({ type: "mystery" })]));
    expect(screen.getByText("Common")).toBeInTheDocument();
  });

  it("AC 2: Accept, Reject and Reroll dispatch the matching action", async () => {
    show(build([ambush()]));

    await userEvent.click(screen.getByRole("button", { name: "Accept Ambush event" }));
    await userEvent.click(screen.getByRole("button", { name: "Reject Ambush event" }));
    await userEvent.click(screen.getByRole("button", { name: "Reroll Ambush event" }));

    const calls = fixture.dispatch.mock.calls.map(([action]) => action);
    expect(calls[0]).toEqual({ type: "acceptEvent", eventId: "e_1" });
    expect(calls[1]).toEqual({ type: "rejectEvent", eventId: "e_1" });
    expect(calls[2]).toMatchObject({ type: "rerollEvent", eventId: "e_1" });
    expect(Number.isNaN(Date.parse(calls[2].now))).toBe(false);
  });

  it("AC 2: the card disappears once the proposal is resolved and shows a replacement after Reroll", () => {
    const { rerender } = show(build([ambush()]));
    expect(screen.getByRole("button", { name: /Accept/ })).toBeInTheDocument();

    fixture.universe = build([ambush({ id: "e_2", type: "save", rerollCount: 1 })]);
    rerender(<ProposalCard />);
    expect(screen.getByRole("heading", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept Save event" })).toBeInTheDocument();

    fixture.universe = build([ambush({ id: "e_2", state: "accepted" })]);
    rerender(<ProposalCard />);
    expect(screen.queryByRole("button", { name: /Accept/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Save" })).not.toBeInTheDocument();
  });

  it("AC 2: a reroll that keeps the same proposal says no other event is available", async () => {
    const { rerender } = show(build([ambush()]));
    expect(screen.queryByText("No other event available.")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Reroll/ }));
    rerender(<ProposalCard />);

    expect(screen.getByRole("status")).toHaveTextContent("No other event available.");
    expect(screen.getByRole("button", { name: /Accept/ })).toBeInTheDocument();

    fixture.universe = build([ambush({ id: "e_2", rerollCount: 1 })]);
    rerender(<ProposalCard />);
    expect(screen.queryByText("No other event available.")).not.toBeInTheDocument();
  });

  it("AC 3: renders nothing without a pending proposal", () => {
    const { container } = show(build([ambush({ state: "rejected" })]));

    expect(container).toBeEmptyDOMElement();
  });

  it("AC 3: shows a dismissible 'No event this time' status after an empty roll", async () => {
    const universe = build([]);
    universe.matchResults = [
      { id: "m_1", week: 1, type: "1v1", participantIds: ["w_a", "w_b"], winnerIds: ["w_a"], recordedAt: "x" },
    ];
    const { container } = show(universe, { lastRoll: "no-event" });

    expect(screen.getByRole("status")).toHaveTextContent("No event this time");
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Dismiss message" }));
    expect(container).toBeEmptyDOMElement();
  });

  it("AC 4: buttons are keyboard-focusable and have accessible names", async () => {
    show(build([ambush({ suggestions: [suggestion()] })]));

    for (const name of ["Accept Ambush event", "Reject Ambush event", "Reroll Ambush event"]) {
      expect(screen.getByRole("button", { name })).toBeEnabled();
    }

    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Accept Ambush event" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Reject Ambush event" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(fixture.dispatch).toHaveBeenCalledWith({ type: "rejectEvent", eventId: "e_1" });
  });

  it("AC 4: disables every control in read-only mode", () => {
    show(build([ambush()]), { readOnly: true });

    screen.getAllByRole("button").forEach((button) => expect(button).toBeDisabled());
  });

  it("AC 5: applies the stacking classes and the CSS stacks below 600px", () => {
    const { container } = show(build([ambush()]));
    const css = readFileSync("index.css", "utf8");

    expect(container.querySelector(".proposal-card")).not.toBeNull();
    expect(container.querySelector(".proposal-card .proposal-actions")).not.toBeNull();

    const mobile = css.slice(css.lastIndexOf("@media (max-width: 600px)"));
    expect(mobile).toContain(".proposal-actions");
    expect(mobile).toContain("flex-direction: column");
    expect(mobile).toContain("width: 100%");
  });

  it("AC 6: before Accept the suggestion is only text", () => {
    show(build([ambush({ suggestions: [suggestion()] })]));

    expect(
      screen.getByText(/If accepted, you may confirm a title shot for ALPHA/)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Confirm title shot/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument();
  });

  it("AC 6: an accepted event keeps Confirm and Dismiss visible until resolved", async () => {
    show(build([ambush({ state: "accepted", suggestions: [suggestion()] })]));

    const region = screen.getByRole("region", { name: "Title-shot suggestions" });
    expect(screen.queryByRole("button", { name: /Accept/ })).not.toBeInTheDocument();

    await userEvent.click(
      within(region).getByRole("button", { name: "Confirm title shot for ALPHA" })
    );
    await userEvent.click(within(region).getByRole("button", { name: "Dismiss" }));

    expect(fixture.dispatch.mock.calls.map(([action]) => action)).toEqual([
      { type: "confirmSuggestion", eventId: "e_1", suggestionId: "g_1" },
      { type: "dismissSuggestion", eventId: "e_1", suggestionId: "g_1" },
    ]);
  });

  it("AC 6: resolved suggestions disappear and the newest is listed first", () => {
    const { container, rerender } = show(
      build([
        ambush({ id: "e_old", state: "accepted", createdAt: "2026-01-01T00:00:00.000Z", suggestions: [suggestion({ id: "g_old", wrestlerId: "w_a" })] }),
        ambush({ id: "e_new", state: "accepted", createdAt: "2026-02-01T00:00:00.000Z", suggestions: [suggestion({ id: "g_new", wrestlerId: "w_b" })] }),
      ])
    );

    const names = screen
      .getAllByRole("button", { name: /Confirm title shot for/ })
      .map((button) => button.textContent);
    expect(names).toEqual(["Confirm title shot for BRAVO", "Confirm title shot for ALPHA"]);

    fixture.universe = build([
      ambush({ state: "accepted", suggestions: [suggestion({ state: "confirmed" })] }),
    ]);
    rerender(<ProposalCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it("AC 6: Accept alone changes no wrestler status", () => {
    const universe = build([ambush({ suggestions: [suggestion()] })]);
    const { universe: after } = reducer(
      { universe, readOnly: false, notice: null, saveError: null, banners: [] },
      { type: "acceptEvent", eventId: "e_1" }
    );

    expect(after.wrestlers.map((w) => w.status)).toEqual(["available", "available"]);
  });
});
