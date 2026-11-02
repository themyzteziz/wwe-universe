import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DEFAULT_SETTINGS } from "../../universe/constants";
import { createEmptyUniverse, V2_KEY } from "../../universe/schema";
import { reducer, UniverseProvider } from "../../universe/UniverseContext";
import SettingsPanel from "./SettingsPanel";

function seedSettings(settings = {}) {
  const universe = createEmptyUniverse();
  universe.settings = { ...DEFAULT_SETTINGS, ...settings };
  window.localStorage.setItem(V2_KEY, JSON.stringify(universe));
}

function renderPanel() {
  return render(
    <UniverseProvider>
      <SettingsPanel />
    </UniverseProvider>
  );
}

const slider = (name) => screen.getByRole("slider", { name });
const seedInput = () => screen.getByRole("textbox", { name: "Fixed seed" });
const savedSettings = () => JSON.parse(window.localStorage.getItem(V2_KEY)).settings;
const enterSeed = (text) => fireEvent.change(seedInput(), { target: { value: text } });

function stateWith(settings) {
  const universe = createEmptyUniverse();
  universe.settings = { ...DEFAULT_SETTINGS, ...settings };
  return { universe, readOnly: false, banners: [], notice: null, saveError: null };
}

describe("SettingsPanel", () => {
  beforeEach(() => {
    window.localStorage.clear();
    seedSettings();
  });

  it("AC 1: shows label, current value and helper text for every setting", () => {
    renderPanel();

    expect(slider("Event frequency")).toHaveValue("25");
    expect(slider("Chaos")).toHaveValue("50");
    expect(slider("History sensitivity")).toHaveValue("50");
    expect(screen.getByRole("checkbox", { name: "Auto-propose after each result" })).toBeChecked();
    expect(seedInput()).toHaveValue("");

    expect(slider("Event frequency")).toHaveAccessibleDescription(
      "How often a result triggers an event proposal; 0 means never."
    );
    expect(slider("Chaos")).toHaveAccessibleDescription(
      "Higher values make unexpected and rarer events more likely."
    );
    expect(slider("History sensitivity")).toHaveAccessibleDescription(
      "How strongly past relationships and storylines influence which events happen."
    );
    expect(screen.getByRole("checkbox")).toHaveAccessibleDescription(
      "Roll for an event automatically after each recorded result."
    );
    expect(seedInput()).toHaveAccessibleDescription(
      "Fixed seed for reproducible rolls (debugging); leave blank for automatic."
    );
    expect(slider("Chaos")).toHaveAttribute("aria-valuetext", "50 out of 100");
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("AC 2: changes persist after remount", async () => {
    const { unmount } = renderPanel();

    fireEvent.change(slider("Event frequency"), { target: { value: "80" } });
    fireEvent.change(slider("Chaos"), { target: { value: "10" } });
    await userEvent.click(screen.getByRole("checkbox"));
    enterSeed("42");
    unmount();

    expect(savedSettings()).toMatchObject({
      eventFrequency: 80,
      chaos: 10,
      historySensitivity: 50,
      autoPropose: false,
      seed: 42,
    });

    renderPanel();

    expect(slider("Event frequency")).toHaveValue("80");
    expect(slider("Chaos")).toHaveValue("10");
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(seedInput()).toHaveValue("42");
  });

  it("AC 3: reset restores 25/50/50/auto on and blank seed", async () => {
    renderPanel();

    fireEvent.change(slider("Event frequency"), { target: { value: "0" } });
    fireEvent.change(slider("History sensitivity"), { target: { value: "99" } });
    await userEvent.click(screen.getByRole("checkbox"));
    enterSeed("7");

    await userEvent.click(screen.getByRole("button", { name: "Reset to defaults" }));

    expect(slider("Event frequency")).toHaveValue("25");
    expect(slider("Chaos")).toHaveValue("50");
    expect(slider("History sensitivity")).toHaveValue("50");
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(seedInput()).toHaveValue("");
  });

  it.each(["abc", "-1", "1.5", "99999999999999999999"])(
    "AC 4: rejects seed %s with an inline message and does not save it",
    (text) => {
      const { unmount } = renderPanel();

      enterSeed(text);

      expect(screen.getByRole("alert")).toHaveTextContent(
        "Seed must be a whole number 0 or higher, or blank"
      );
      unmount();

      expect(savedSettings().seed).toBeNull();
    }
  );

  it("AC 4: clears the message once the seed is blank", () => {
    renderPanel();

    enterSeed("x");
    expect(screen.getByRole("alert")).toBeInTheDocument();

    enterSeed("");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("settings reducer actions", () => {
  it("AC 4: updateSettings ignores invalid values and leaves state unchanged", () => {
    const state = stateWith({});

    for (const settings of [
      { eventFrequency: 101 },
      { chaos: -1 },
      { historySensitivity: "50" },
      { seed: -1 },
      { seed: 1.5 },
      { aiEndpoint: "http://example.com" },
    ]) {
      expect(reducer(state, { type: "updateSettings", settings })).toBe(state);
    }
  });

  it("AC 5: eventFrequency 0 is accepted and stored so automatic rolls can read it", () => {
    const next = reducer(stateWith({}), {
      type: "updateSettings",
      settings: { eventFrequency: 0 },
    });

    expect(next.universe.settings.eventFrequency).toBe(0);
  });

  it("AC 3: resetSettings restores defaults including the AI fields", () => {
    const state = stateWith({
      eventFrequency: 0,
      aiEnabled: true,
      aiEndpoint: "https://example.com/describe",
      seed: 5,
    });
    const next = reducer(state, { type: "resetSettings" });

    expect(next.universe.settings).toEqual(DEFAULT_SETTINGS);
  });
});
