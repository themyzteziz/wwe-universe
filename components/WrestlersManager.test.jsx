// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import WrestlersManager from "./WrestlersManager";

const wrestlers = [
  { id: "w_1", name: "ALPHA", wins: 0, status: "available", champion: false, notes: "" },
  { id: "w_2", name: "BETA", wins: 0, status: "available", champion: false, notes: "" },
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("WrestlersManager", () => {
  it("lists wrestlers with no faction badges (the profile shows factions)", () => {
    render(<WrestlersManager wrestlers={wrestlers} dispatch={vi.fn()} />);
    expect(screen.getByText("ALPHA")).toBeInTheDocument();
    expect(screen.queryByTitle("Faction")).not.toBeInTheDocument();
  });

  it("refuses to add a duplicate wrestler", async () => {
    const dispatch = vi.fn();
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<WrestlersManager wrestlers={wrestlers} dispatch={dispatch} />);
    await userEvent.type(screen.getByPlaceholderText("Wrestler name"), "alpha");
    await userEvent.click(screen.getByRole("button", { name: "Add Wrestler" }));
    expect(alertSpy).toHaveBeenCalledWith("That wrestler already exists.");
    expect(dispatch).not.toHaveBeenCalled();
  });
});
