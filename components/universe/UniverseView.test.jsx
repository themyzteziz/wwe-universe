import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App";
import { UniverseProvider } from "../../universe/UniverseContext";
import { createEmptyUniverse, V2_KEY } from "../../universe/schema";

function seedWithProposal() {
  const universe = createEmptyUniverse();
  universe.wrestlers = [
    { id: "w_1", name: "A", status: "available", wins: 0, champion: false, notes: "" },
    { id: "w_2", name: "B", status: "available", wins: 0, champion: false, notes: "" },
  ];
  universe.events = [
    {
      id: "e_1",
      type: "rivalry",
      week: 1,
      participantIds: ["w_1", "w_2"],
      state: "proposed",
      seed: 1,
      deltas: [],
      description: "",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ];
  window.localStorage.setItem(V2_KEY, JSON.stringify(universe));
}

function renderApp() {
  return render(
    <UniverseProvider>
      <App />
    </UniverseProvider>
  );
}

describe("UNIVERSE view navigation shell", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("AC 1: shows three top-level tabs and the four sub-tabs after clicking UNIVERSE", async () => {
    renderApp();

    expect(screen.getByRole("button", { name: "BOOKING" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "WRESTLERS" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "UNIVERSE" }));

    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);
    expect(tabs).toEqual(["Timeline", "Relationships", "Settings", "Backup"]);
    expect(screen.getByRole("tab", { name: "Timeline" })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    await userEvent.click(screen.getByRole("tab", { name: "Backup" }));

    expect(screen.getByRole("tab", { name: "Backup" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("tab", { name: "Timeline" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("AC 1: resets to Timeline when returning to UNIVERSE", async () => {
    renderApp();

    await userEvent.click(screen.getByRole("button", { name: "UNIVERSE" }));
    await userEvent.click(screen.getByRole("tab", { name: "Settings" }));
    await userEvent.click(screen.getByRole("button", { name: "BOOKING" }));
    await userEvent.click(screen.getByRole("button", { name: "UNIVERSE" }));

    expect(screen.getByRole("tab", { name: "Timeline" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("AC 2: BOOKING and WRESTLERS still render their own content and hide the universe shell", async () => {
    renderApp();

    expect(screen.getByRole("heading", { name: "Match Generator" })).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "WRESTLERS" }));

    expect(screen.queryByRole("heading", { name: "Match Generator" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("AC 3: shows a badge with the pending count on the UNIVERSE tab", () => {
    seedWithProposal();
    renderApp();

    expect(screen.getByLabelText("pending proposals")).toHaveTextContent("1");
  });

  it("AC 3: hides the badge when no proposal is pending", () => {
    renderApp();

    expect(screen.queryByLabelText("pending proposals")).not.toBeInTheDocument();
  });
});
