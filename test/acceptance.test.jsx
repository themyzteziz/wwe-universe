// Continuity acceptance tests for the simulation loop (US-130).
// Only AC 6 is covered so far: the other ACs need the event engine, the proposal
// reducer actions and the review panel (US-124 to US-129), which are not on this
// branch yet. They are added here when those stories land.
import { screen } from "@testing-library/react";
import legacyRoster from "./fixtures/legacyRoster.json";
import { stubStorage } from "./helpers.js";
import { renderApp } from "./helpers.jsx";
import { V2_KEY } from "../universe/schema.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

function listedNames() {
  return [...document.querySelectorAll(".roster-table .wrestler-name")]
    .map((cell) => cell.textContent.replace("👑", "").trim())
    .sort();
}

describe("US-130 AC 6: migration", () => {
  it("renders BOOKING listing every legacy wrestler and leaves the legacy keys untouched", () => {
    const rawRoster = JSON.stringify(legacyRoster.wrestlers);
    const rawWeek = String(legacyRoster.currentWeek);
    const storage = stubStorage({ wrestlers: rawRoster, currentWeek: rawWeek });

    renderApp();

    expect(screen.getByRole("button", { name: "BOOKING" })).toHaveClass("active");
    expect(screen.getByRole("heading", { name: "Match Generator" })).toBeInTheDocument();
    expect(listedNames()).toEqual(legacyRoster.wrestlers.map((w) => w.name).sort());
    expect(legacyRoster.wrestlers.length).toBeGreaterThanOrEqual(6);

    expect(storage.getItem("wrestlers")).toBe(rawRoster);
    expect(storage.getItem("currentWeek")).toBe(rawWeek);

    const migrated = JSON.parse(storage.getItem(V2_KEY));
    expect(migrated.week).toBe(legacyRoster.currentWeek);
    expect(migrated.wrestlers).toHaveLength(legacyRoster.wrestlers.length);
  });
});
