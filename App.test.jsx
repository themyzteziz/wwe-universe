import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { UniverseProvider } from "./universe/UniverseContext";
import { V2_KEY } from "./universe/schema";

function renderApp() {
  return render(
    <UniverseProvider>
      <App />
    </UniverseProvider>
  );
}

function storedUniverse() {
  return JSON.parse(window.localStorage.getItem(V2_KEY));
}

function winsOf(name) {
  const plus = screen.getByRole("button", {
    name: `Add one win to ${name}`,
  });

  return Number(
    within(plus.parentElement).getByText(/^\d+$/).textContent
  );
}

async function generateAndPickWinner() {
  await userEvent.click(
    screen.getByRole("button", { name: "Generate Match" })
  );

  const [first] = screen.getAllByRole("button", {
    name: /^Mark .* as winner$/,
  });
  const name = first.getAttribute("aria-label").slice(5, -10);

  return { first, name };
}

describe("App smoke test", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the navigation and the Match Generator heading", () => {
    renderApp();

    expect(
      screen.getByRole("button", { name: "BOOKING" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "WRESTLERS" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Match Generator" })
    ).toBeInTheDocument();
  });

  it("replaces the booking content when WRESTLERS is selected", async () => {
    renderApp();

    await userEvent.click(
      screen.getByRole("button", { name: "WRESTLERS" })
    );

    expect(
      screen.queryByRole("heading", { name: "Match Generator" })
    ).not.toBeInTheDocument();
  });
});

describe("US-117 match results in the app", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("AC 1, 4, 5: records a result, persists it across a reload and undoes it", async () => {
    const view = renderApp();
    const { first, name } = await generateAndPickWinner();
    const before = winsOf(name);

    await userEvent.click(first);

    expect(
      screen.getByText(`Result recorded: ${name}`)
    ).toBeInTheDocument();
    expect(winsOf(name)).toBe(before + 1);
    screen
      .getAllByRole("button", { name: /^Mark .* as winner$/ })
      .forEach((button) => expect(button).toBeDisabled());

    view.unmount();

    const saved = storedUniverse();

    expect(saved.matchResults).toHaveLength(1);
    expect(saved.matchResults[0]).toMatchObject({
      week: 1,
      type: "1v1",
    });
    expect(saved.matchResults[0].participantIds).toHaveLength(2);
    expect(saved.matchResults[0].winnerIds).toHaveLength(1);

    renderApp();

    expect(
      screen.getByText(`Week 1 1v1: ${name} won`)
    ).toBeInTheDocument();
    expect(winsOf(name)).toBe(before + 1);

    await userEvent.click(
      screen.getByRole("button", { name: "Undo last result" })
    );

    expect(winsOf(name)).toBe(before);
    expect(
      screen.queryByRole("button", { name: "Undo last result" })
    ).not.toBeInTheDocument();
  });

  it("AC 2: generating and rerolling without Winner records nothing", async () => {
    const view = renderApp();

    await userEvent.click(
      screen.getByRole("button", { name: "Generate Match" })
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Reroll Match" })
    );

    expect(
      screen.queryByRole("button", { name: "Undo last result" })
    ).not.toBeInTheDocument();
    view.unmount();
    expect(storedUniverse().matchResults).toEqual([]);
  });

  it("AC 3: roster +/- only change wins and create no result", async () => {
    const view = renderApp();
    const [plus] = screen.getAllByRole("button", {
      name: /^Add one win to /,
    });
    const name = plus.getAttribute("aria-label").slice(15);
    const before = winsOf(name);

    await userEvent.click(plus);

    expect(winsOf(name)).toBe(before + 1);
    expect(
      screen.queryByRole("button", { name: "Undo last result" })
    ).not.toBeInTheDocument();
    view.unmount();
    expect(storedUniverse().matchResults).toEqual([]);
  });

  it("AC 5: invalid saved data does not crash and shows no results", () => {
    window.localStorage.setItem(
      V2_KEY,
      JSON.stringify({ schemaVersion: 2, matchResults: "broken" })
    );

    renderApp();

    expect(
      screen.getByRole("heading", { name: "Match Generator" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Undo last result" })
    ).not.toBeInTheDocument();
  });
});
