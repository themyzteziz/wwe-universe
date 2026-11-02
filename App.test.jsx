import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

describe("App smoke test", () => {
  it("renders the navigation and the Match Generator heading", () => {
    render(<App />);

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
    render(<App />);

    await userEvent.click(
      screen.getByRole("button", { name: "WRESTLERS" })
    );

    expect(
      screen.queryByRole("heading", { name: "Match Generator" })
    ).not.toBeInTheDocument();
  });
});
