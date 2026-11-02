import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MatchGenerator from "./MatchGenerator";
import { createEmptyUniverse } from "../universe/schema.js";
import { recordResult, undoLastResult } from "../universe/matchResults.js";

function wrestler(id, name) {
  return { id, name, status: "available", wins: 0, champion: false, notes: "" };
}

function Harness({ week = 1, initial, spy }) {
  const [universe, setUniverse] = useState(initial);

  return (
    <>
      <MatchGenerator
        currentWeek={week}
        wrestlers={universe.wrestlers}
        matchResults={universe.matchResults}
        onRecord={(payload) => {
          spy?.(payload);
          setUniverse((u) => recordResult(u, payload));
        }}
        onUndo={() => setUniverse(undoLastResult)}
      />
      <output data-testid="wins">
        {universe.wrestlers.map((w) => `${w.name}:${w.wins}`).join(",")}
      </output>
    </>
  );
}

function startUniverse() {
  const u = createEmptyUniverse();
  u.wrestlers = [wrestler("w_a", "ALPHA"), wrestler("w_b", "BRAVO")];
  return u;
}

describe("MatchGenerator result recording", () => {
  it("AC 1: Winner stores one result, adds a win and disables the buttons", async () => {
    const spy = vi.fn();
    render(<Harness initial={startUniverse()} spy={spy} />);

    await userEvent.click(screen.getByRole("button", { name: "Generate Match" }));
    await userEvent.click(screen.getByRole("button", { name: "Mark BRAVO as winner" }));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toMatchObject({
      week: 1,
      type: "1v1",
      winnerIds: ["w_b"],
    });
    expect([...spy.mock.calls[0][0].participantIds].sort()).toEqual(["w_a", "w_b"]);
    expect(screen.getByText("Result recorded: BRAVO")).toBeInTheDocument();
    expect(screen.getByTestId("wins")).toHaveTextContent("ALPHA:0,BRAVO:1");
    expect(screen.getByRole("button", { name: "Mark ALPHA as winner" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Mark BRAVO as winner" })).toBeDisabled();
  });

  it("AC 1: rerolling clears the recorded panel and allows a new result", async () => {
    render(<Harness initial={startUniverse()} />);

    await userEvent.click(screen.getByRole("button", { name: "Generate Match" }));
    await userEvent.click(screen.getByRole("button", { name: "Mark ALPHA as winner" }));
    await userEvent.click(screen.getByRole("button", { name: "Reroll Match" }));

    expect(screen.queryByText(/Result recorded/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark ALPHA as winner" })).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: "Mark ALPHA as winner" }));
    expect(screen.getByTestId("wins")).toHaveTextContent("ALPHA:2,BRAVO:0");
  });

  it("AC 1: changing the week clears the panel", async () => {
    const initial = startUniverse();
    const { rerender } = render(<Harness initial={initial} />);

    await userEvent.click(screen.getByRole("button", { name: "Generate Match" }));
    await userEvent.click(screen.getByRole("button", { name: "Mark ALPHA as winner" }));
    rerender(<Harness week={4} initial={initial} />);

    expect(screen.queryByText(/Result recorded/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /as winner/ })).not.toBeInTheDocument();
  });

  it("AC 2: generating and rerolling without Winner records nothing", async () => {
    const spy = vi.fn();
    render(<Harness initial={startUniverse()} spy={spy} />);

    await userEvent.click(screen.getByRole("button", { name: "Generate Match" }));
    await userEvent.click(screen.getByRole("button", { name: "Reroll Match" }));

    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByTestId("wins")).toHaveTextContent("ALPHA:0,BRAVO:0");
    expect(screen.queryByRole("button", { name: "Undo last result" })).not.toBeInTheDocument();
  });

  it("AC 3: without result handlers the generator shows no result controls", async () => {
    const { wrestlers } = startUniverse();
    render(<MatchGenerator currentWeek={1} wrestlers={wrestlers} />);

    await userEvent.click(screen.getByRole("button", { name: "Generate Match" }));

    expect(screen.queryByRole("button", { name: /as winner/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Undo last result" })).not.toBeInTheDocument();
  });

  it("AC 4: Undo names the last result, steps back one at a time and then disappears", async () => {
    render(<Harness initial={startUniverse()} />);

    await userEvent.click(screen.getByRole("button", { name: "Generate Match" }));
    await userEvent.click(screen.getByRole("button", { name: "Mark ALPHA as winner" }));
    await userEvent.click(screen.getByRole("button", { name: "Reroll Match" }));
    await userEvent.click(screen.getByRole("button", { name: "Mark BRAVO as winner" }));

    expect(screen.getByText("Week 1 1v1: BRAVO won")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Undo last result" }));
    expect(screen.getByTestId("wins")).toHaveTextContent("ALPHA:1,BRAVO:0");
    expect(screen.getByText("Week 1 1v1: ALPHA won")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Undo last result" }));
    expect(screen.getByTestId("wins")).toHaveTextContent("ALPHA:0,BRAVO:0");
    expect(screen.queryByRole("button", { name: "Undo last result" })).not.toBeInTheDocument();
  });

  it("AC 6: Undo works when the winner left the roster", async () => {
    const onUndo = vi.fn();
    const matchResults = [
      { id: "m_1", week: 2, type: "3MAN ELI", participantIds: ["w_a", "w_x"], winnerIds: ["w_x"], recordedAt: "t", seed: 1 },
    ];
    render(
      <MatchGenerator
        currentWeek={2}
        wrestlers={startUniverse().wrestlers}
        matchResults={matchResults}
        onRecord={() => {}}
        onUndo={onUndo}
      />
    );

    expect(screen.getByText("Week 2 3MAN ELI: A removed wrestler won")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Undo last result" }));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });
});
