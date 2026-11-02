import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import BackupPanel from "./BackupPanel";
import { V2_KEY, validateUniverse } from "../../universe/schema";
import { UniverseProvider, useUniverse } from "../../universe/UniverseContext";

let blobs;
let clicks;

function readBlob(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(blob);
  });
}

let dispatchRef;

function Harness() {
  const { banners, dispatch } = useUniverse();
  dispatchRef = dispatch;

  return (
    <>
      <BackupPanel />
      {banners.map((banner) => (
        <p key={banner.id} data-testid="banner">
          {banner.text}
        </p>
      ))}
    </>
  );
}

function renderPanel() {
  return render(
    <UniverseProvider>
      <Harness />
    </UniverseProvider>
  );
}

beforeEach(() => {
  blobs = [];
  clicks = [];
  URL.createObjectURL = vi.fn((blob) => {
    blobs.push(blob);
    return "blob:test";
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function click() {
    clicks.push({ download: this.download, href: this.href });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BackupPanel", () => {
  it("AC 1: downloads a valid universe file named wwe-universe-YYYY-MM-DD.json", async () => {
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Export" }));

    expect(clicks).toHaveLength(1);
    expect(clicks[0].download).toMatch(/^wwe-universe-\d{4}-\d{2}-\d{2}\.json$/);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");

    const parsed = JSON.parse(await readBlob(blobs[0]));
    expect(validateUniverse(parsed)).toEqual([]);
    expect(parsed.wrestlers.length).toBeGreaterThan(0);
  });

  it("AC 4: exported settings carry no AI fields even when an endpoint is configured", async () => {
    renderPanel();
    const stored = JSON.parse(window.localStorage.getItem(V2_KEY));
    act(() =>
      dispatchRef({
        type: "replaceUniverse",
        universe: { ...stored, settings: { ...stored.settings, aiEnabled: true, aiEndpoint: "https://example.com/ai" } },
      })
    );
    await userEvent.click(screen.getByRole("button", { name: "Export" }));

    const text = await readBlob(blobs[0]);
    expect(text).not.toContain("aiEnabled");
    expect(text).not.toContain("aiEndpoint");
    expect(text).not.toContain("example.com");
  });

  it("AC 5: exports in-memory changes that have not been saved yet", async () => {
    renderPanel();
    act(() => dispatchRef({ type: "addWrestler", id: "w_unsaved", name: "Unsaved Star" }));
    await userEvent.click(screen.getByRole("button", { name: "Export" }));

    expect(window.localStorage.getItem(V2_KEY)).not.toContain("w_unsaved");

    const parsed = JSON.parse(await readBlob(blobs[0]));
    expect(parsed.wrestlers.some((wrestler) => wrestler.id === "w_unsaved")).toBe(true);
  });

  it("AC 5: in read-only mode exports the raw stored string and shows a notice", async () => {
    const raw = '{"schemaVersion": 99, "keep": "me"}';
    window.localStorage.setItem(V2_KEY, raw);
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Export" }));

    expect(await readBlob(blobs[0])).toBe(raw);
    expect(
      screen.getAllByTestId("banner").some((banner) => /exported exactly as it is/.test(banner.textContent))
    ).toBe(true);
  });

  it("shows 'Export failed – try again' when the download throws", async () => {
    URL.createObjectURL = vi.fn(() => {
      throw new Error("no blobs");
    });
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Export" }));

    expect(clicks).toHaveLength(0);
    expect(
      screen.getAllByTestId("banner").some((banner) => banner.textContent === "Export failed – try again")
    ).toBe(true);
  });
});
