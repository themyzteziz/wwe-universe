import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UniverseProvider } from "../../universe/UniverseContext";
import { createEmptyUniverse, V2_KEY } from "../../universe/schema";
import Timeline from "./Timeline";

const wrestler = (id, name) => ({
  id,
  name,
  status: "available",
  wins: 0,
  champion: false,
  notes: "",
});

function seed(mutate) {
  const universe = createEmptyUniverse();
  universe.wrestlers = [wrestler("w_1", "ALPHA"), wrestler("w_2", "BETA"), wrestler("w_3", "GAMMA")];
  mutate?.(universe);
  window.localStorage.setItem(V2_KEY, JSON.stringify(universe));
}

const event = (id, week, participantIds, state, type = "ambush") => ({
  id,
  type,
  week,
  participantIds,
  state,
  seed: 1,
  deltas: [],
  description: `Description ${id}`,
  createdAt: `2026-01-01T00:00:0${week}.000Z`,
});

const match = (i, week, participantIds, winnerIds) => ({
  id: `m_${i}`,
  week,
  type: "1v1",
  participantIds,
  winnerIds,
  recordedAt: "2026-01-01T00:00:00.000Z",
});

function renderTimeline() {
  return render(
    <UniverseProvider>
      <Timeline />
    </UniverseProvider>
  );
}

const rows = () => screen.queryAllByRole("listitem");

describe("Timeline", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("AC 4: shows 'Nothing has happened yet' when the universe has no entries", () => {
    renderTimeline();

    expect(screen.getByText("Nothing has happened yet")).toBeInTheDocument();
  });

  it("AC 4: shows 'No entries match these filters' when a filter excludes everything", async () => {
    seed((u) => {
      u.matchResults = [match(1, 1, ["w_1", "w_2"], ["w_1"])];
    });
    renderTimeline();

    await userEvent.selectOptions(screen.getByLabelText("Wrestler"), "w_3");

    expect(screen.getByText("No entries match these filters")).toBeInTheDocument();
  });

  it("AC 1 and AC 5: renders stored entries newest first and toggles to oldest first", async () => {
    seed((u) => {
      u.matchResults = [match(1, 1, ["w_1", "w_2"], ["w_1"])];
      u.events = [event("e_1", 2, ["w_2", "w_3"], "accepted")];
    });
    renderTimeline();

    expect(rows()[0]).toHaveTextContent("Description e_1");
    expect(rows()[1]).toHaveTextContent("ALPHA def. BETA");

    await userEvent.click(screen.getByRole("button", { name: "Newest first" }));

    expect(rows()[0]).toHaveTextContent("ALPHA def. BETA");
    expect(screen.getByRole("button", { name: "Oldest first" })).toBeInTheDocument();
  });

  it("AC 2: selecting a wrestler shows only entries including them", async () => {
    seed((u) => {
      u.matchResults = [
        match(1, 1, ["w_1", "w_2"], ["w_1"]),
        match(2, 2, ["w_2", "w_3"], ["w_3"]),
      ];
    });
    renderTimeline();

    await userEvent.selectOptions(screen.getByLabelText("Wrestler"), "w_1");

    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toHaveTextContent("ALPHA def. BETA");
  });

  it("filters by event type", async () => {
    seed((u) => {
      u.matchResults = [match(1, 1, ["w_1", "w_2"], ["w_1"])];
      u.events = [
        event("e_1", 2, ["w_1", "w_2"], "accepted", "ambush"),
        event("e_2", 3, ["w_1", "w_2"], "accepted", "respect"),
      ];
    });
    renderTimeline();

    await userEvent.selectOptions(screen.getByLabelText("Event type"), "respect");

    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toHaveTextContent("Description e_2");
  });

  it("filters by week range and shows an inline message for an invalid range", async () => {
    seed((u) => {
      u.matchResults = [
        match(1, 1, ["w_1", "w_2"], ["w_1"]),
        match(2, 5, ["w_1", "w_2"], ["w_2"]),
      ];
    });
    renderTimeline();

    await userEvent.type(screen.getByLabelText("From week"), "3");

    expect(rows()).toHaveLength(1);

    await userEvent.type(screen.getByLabelText("To week"), "2");

    expect(screen.getByRole("alert")).toHaveTextContent("must not be after");
    expect(rows()).toHaveLength(2);
  });

  it("AC 3: hides rejected events by default and shows them dimmed with a label", async () => {
    seed((u) => {
      u.events = [
        event("e_1", 1, ["w_1", "w_2"], "accepted"),
        event("e_2", 2, ["w_1", "w_2"], "rejected"),
      ];
    });
    renderTimeline();

    expect(rows()).toHaveLength(1);
    expect(screen.queryByText("Rejected")).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Show rejected"));

    expect(rows()).toHaveLength(2);

    const rejected = rows()[0];

    expect(rejected).toHaveClass("dimmed");
    expect(within(rejected).getByText("Rejected")).toBeInTheDocument();
    expect(rows()[1]).not.toHaveClass("dimmed");
  });

  it("AC 6: pages 500 entries at 50 per page and resets to page 1 on filter change", async () => {
    seed((u) => {
      u.matchResults = Array.from({ length: 500 }, (_, i) =>
        match(i, i + 1, ["w_1", "w_2"], ["w_1"])
      );
    });
    renderTimeline();

    expect(rows()).toHaveLength(50);
    expect(screen.getByText("Page 1 of 10")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prev" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText("Page 2 of 10")).toBeInTheDocument();
    expect(rows()[0]).toHaveTextContent("Week 450");

    await userEvent.selectOptions(screen.getByLabelText("Wrestler"), "w_2");

    expect(screen.getByText("Page 1 of 10")).toBeInTheDocument();
  });
});
