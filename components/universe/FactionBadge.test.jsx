// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RelationshipProfile from "./RelationshipProfile.jsx";
import { UniverseProvider } from "../../universe/UniverseContext.jsx";
import { createEmptyUniverse, V2_KEY } from "../../universe/schema.js";

const wrestler = (id, name) => ({
  id,
  name,
  wins: 0,
  status: "available",
  champion: false,
  notes: "",
});

function seed(factions) {
  localStorage.setItem(
    V2_KEY,
    JSON.stringify({
      ...createEmptyUniverse(),
      wrestlers: [wrestler("w_1", "ALPHA"), wrestler("w_2", "BETA"), wrestler("w_3", "GAMMA")],
      factions,
    })
  );
}

const active = { id: "f_1", name: "Iron Order", memberIds: ["w_1", "w_2"], formedEventId: "e_1", formedWeek: 1, active: true };
const dissolved = { id: "f_2", name: "Old Pack", memberIds: ["w_3"], formedEventId: "e_0", formedWeek: 1, active: false, dissolvedWeek: 2 };

const show = (id) =>
  render(
    <UniverseProvider>
      <RelationshipProfile wrestlerId={id} />
    </UniverseProvider>
  );

beforeEach(() => localStorage.clear());

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AC 6: faction badge and rename on the profile", () => {
  it("shows the active faction name for a member, none for others or dissolved factions", () => {
    seed([active, dissolved]);
    show("w_1");
    expect(screen.getByTitle("Faction")).toHaveTextContent("Iron Order");
    cleanup();
    show("w_3");
    expect(screen.queryByTitle("Faction")).not.toBeInTheDocument();
    expect(screen.queryByText("Old Pack")).not.toBeInTheDocument();
  });

  it("shows no badge on a fresh universe without factions", () => {
    seed([]);
    show("w_1");
    expect(screen.queryByTitle("Faction")).not.toBeInTheDocument();
  });

  it("renames with a trimmed name", async () => {
    seed([active]);
    vi.spyOn(window, "prompt").mockReturnValue("  Black Legion ");
    show("w_1");
    await userEvent.click(screen.getByRole("button", { name: "Rename faction Iron Order" }));
    expect(screen.getByTitle("Faction")).toHaveTextContent("Black Legion");
  });

  it("explains and changes nothing for an empty or too long name; cancel does nothing", async () => {
    seed([active]);
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const prompt = vi.spyOn(window, "prompt");
    show("w_1");
    const button = screen.getByRole("button", { name: "Rename faction Iron Order" });

    prompt.mockReturnValueOnce("   ");
    await userEvent.click(button);
    prompt.mockReturnValueOnce("x".repeat(41));
    await userEvent.click(button);
    expect(alertSpy).toHaveBeenCalledTimes(2);
    expect(alertSpy).toHaveBeenCalledWith("A faction name must be 1 to 40 characters.");

    prompt.mockReturnValueOnce(null);
    await userEvent.click(button);
    expect(alertSpy).toHaveBeenCalledTimes(2);
    expect(screen.getByTitle("Faction")).toHaveTextContent("Iron Order");
  });
});
