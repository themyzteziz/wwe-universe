import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UniverseProvider } from "../../universe/UniverseContext";
import { createEmptyUniverse, V2_KEY } from "../../universe/schema";
import SettingsPanel, { COST_WARNING, ENDPOINT_ERROR } from "./SettingsPanel";

function renderPanel(settings = {}) {
  const universe = createEmptyUniverse();
  universe.settings = { ...universe.settings, ...settings };
  window.localStorage.setItem(V2_KEY, JSON.stringify(universe));

  return render(
    <UniverseProvider>
      <SettingsPanel />
    </UniverseProvider>
  );
}

const endpointInput = () => screen.getByLabelText("Endpoint URL");
const storedSettings = () => JSON.parse(window.localStorage.getItem(V2_KEY)).settings;

describe("SettingsPanel AI section", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("AC 1: AI is off and the endpoint is empty on a fresh universe", () => {
    renderPanel();

    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(endpointInput()).toHaveValue("");
  });

  it("AC 4: has no API key input", () => {
    renderPanel();

    expect(screen.queryByLabelText(/key|token|secret/i)).not.toBeInTheDocument();
  });

  it("AC 5: shows the cost warning only while AI is enabled", async () => {
    renderPanel();

    expect(screen.queryByText(COST_WARNING)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("checkbox"));

    expect(screen.getByText(COST_WARNING)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("checkbox"));

    expect(screen.queryByText(COST_WARNING)).not.toBeInTheDocument();
  });

  it("AC 4: rejects an http:// endpoint inline and never saves it", async () => {
    const view = renderPanel();

    await userEvent.type(endpointInput(), "http://ai.example");

    expect(screen.getByRole("alert")).toHaveTextContent(ENDPOINT_ERROR);

    view.unmount();

    expect(storedSettings().aiEndpoint).toBe("");
  });

  it("AC 2: accepts an https:// endpoint, clears the error and saves it", async () => {
    const view = renderPanel();

    await userEvent.type(endpointInput(), "https://ai.example/describe");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(endpointInput()).toHaveValue("https://ai.example/describe");

    view.unmount();

    expect(storedSettings().aiEndpoint).toBe("https://ai.example/describe");
  });
});
