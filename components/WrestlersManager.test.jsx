// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import WrestlersManager from "./WrestlersManager";

const wrestlers = [
  { id: "w_1", name: "ALPHA", wins: 0, status: "available", champion: false, notes: "" },
  { id: "w_2", name: "BETA", wins: 0, status: "available", champion: false, notes: "" },
  { id: "w_3", name: "GAMMA", wins: 0, status: "available", champion: false, notes: "" },
];

const factions = [
  { id: "f_1", name: "Iron Order", memberIds: ["w_1", "w_2"], formedEventId: "e_1", active: true },
  { id: "f_2", name: "Old Pack", memberIds: ["w_3"], formedEventId: "e_0", active: false },
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AC 6: faction badge and rename", () => {
  it("shows the active faction name on each member and none for dissolved factions", () => {
    render(<WrestlersManager wrestlers={wrestlers} factions={factions} dispatch={vi.fn()} />);
    expect(screen.getAllByTitle("Faction").map((el) => el.textContent)).toEqual([
      "Iron Order",
      "Iron Order",
    ]);
    expect(screen.queryByText("Old Pack")).not.toBeInTheDocument();
  });

  it("dispatches a trimmed rename", async () => {
    const dispatch = vi.fn();
    vi.spyOn(window, "prompt").mockReturnValue("  Black Legion ");
    render(<WrestlersManager wrestlers={wrestlers} factions={factions} dispatch={dispatch} />);
    await userEvent.click(screen.getAllByRole("button", { name: "Rename faction Iron Order" })[0]);
    expect(dispatch).toHaveBeenCalledWith({
      type: "renameFaction",
      factionId: "f_1",
      name: "Black Legion",
    });
  });

  it("explains and does not dispatch for an empty or too long name; cancel does nothing", async () => {
    const dispatch = vi.fn();
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const prompt = vi.spyOn(window, "prompt");
    render(<WrestlersManager wrestlers={wrestlers} factions={factions} dispatch={dispatch} />);
    const button = screen.getAllByRole("button", { name: "Rename faction Iron Order" })[0];

    prompt.mockReturnValueOnce("   ");
    await userEvent.click(button);
    prompt.mockReturnValueOnce("x".repeat(41));
    await userEvent.click(button);
    expect(alertSpy).toHaveBeenCalledTimes(2);
    expect(alertSpy).toHaveBeenCalledWith("A faction name must be 1 to 40 characters.");

    prompt.mockReturnValueOnce(null);
    await userEvent.click(button);
    expect(alertSpy).toHaveBeenCalledTimes(2);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
