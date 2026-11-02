import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import App from "../App";
import Banner from "./Banner";
import { UniverseProvider } from "../universe/UniverseContext";

function renderApp() {
  return render(
    <UniverseProvider>
      <App />
    </UniverseProvider>
  );
}

describe("Banner", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("AC 3: renders its message with a Dismiss button that calls onDismiss", async () => {
    const onDismiss = vi.fn();

    render(
      <Banner kind="info" onDismiss={onDismiss}>
        Roster migrated
      </Banner>
    );

    expect(screen.getByRole("status")).toHaveTextContent("Roster migrated");

    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("uses role alert for errors and status for info and warning", () => {
    const { rerender } = render(<Banner kind="error">Boom</Banner>);

    expect(screen.getByRole("alert")).toHaveTextContent("Boom");

    rerender(<Banner kind="warning">Careful</Banner>);

    expect(screen.getByRole("status")).toHaveClass("banner", "warning");
  });

  it("AC 3: the migration notice shows in the shared banner and can be dismissed", async () => {
    window.localStorage.setItem("wrestlers", "{not json");

    renderApp();

    const banner = screen.getByRole("status");

    expect(banner).toHaveClass("banner");

    await userEvent.click(within(banner).getByRole("button", { name: "Dismiss" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("AC 3: the storage-failure warning shows in the shared banner and can be dismissed", async () => {
    renderApp();

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    await userEvent.click(
      screen.getAllByRole("button", { name: /^Add one win to / })[0]
    );

    const message = await screen.findByText(/may not be saved/, {}, { timeout: 2000 });
    const banner = message.closest(".banner");

    expect(banner).toHaveClass("warning");

    await userEvent.click(within(banner).getByRole("button", { name: "Dismiss" }));

    expect(screen.queryByText(/may not be saved/)).not.toBeInTheDocument();
  });
});
