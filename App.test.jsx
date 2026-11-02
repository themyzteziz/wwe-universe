import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { UniverseProvider } from "./universe/UniverseContext";

function renderApp() {
  return render(
    <UniverseProvider>
      <App />
    </UniverseProvider>
  );
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
