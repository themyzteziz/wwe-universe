import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import ErrorBoundary from "./ErrorBoundary";
import { V2_KEY } from "../universe/schema";

function Bomb() {
  throw new Error("render failed");
}

function renderCrash() {
  return render(
    <ErrorBoundary>
      <Bomb />
    </ErrorBoundary>
  );
}

function mockUrlApi(createObjectURL, revokeObjectURL = vi.fn()) {
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;

  return revokeObjectURL;
}

// jsdom's Blob has no .text()
function readBlob(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(blob);
  });
}

describe("ErrorBoundary", () => {
  let consoleError;

  beforeEach(() => {
    window.localStorage.clear();
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete URL.createObjectURL;
    delete URL.revokeObjectURL;
  });

  it("renders children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>
    );

    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("AC 2: a throwing child shows the fallback with Export backup and Reload and logs the error", () => {
    window.localStorage.setItem(V2_KEY, '{"schemaVersion":2}');

    renderCrash();

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    expect(screen.getByRole("button", { name: "Export backup" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();
  });

  it("AC 2: never writes to or deletes localStorage, and Export downloads the raw stored string", async () => {
    const raw = '{"schemaVersion":2,"corrupt":true';

    window.localStorage.setItem(V2_KEY, raw);

    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const removeItem = vi.spyOn(Storage.prototype, "removeItem");
    const clear = vi.spyOn(Storage.prototype, "clear");
    const blobs = [];
    const revokeObjectURL = mockUrlApi((blob) => {
      blobs.push(blob);
      return "blob:backup";
    });
    const downloads = [];

    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function click() {
      downloads.push(this.download);
    });

    renderCrash();

    await userEvent.click(screen.getByRole("button", { name: "Export backup" }));

    expect(await readBlob(blobs[0])).toBe(raw);
    expect(downloads[0]).toMatch(/^wwe-universe-\d{4}-\d{2}-\d{2}\.json$/);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:backup");
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(V2_KEY)).toBe(raw);
  });

  it("AC 2: Reload calls window.location.reload", async () => {
    const reload = vi.fn();

    vi.stubGlobal("location", { reload });
    window.localStorage.setItem(V2_KEY, "{}");

    renderCrash();

    await userEvent.click(screen.getByRole("button", { name: "Reload" }));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("disables Export with 'Nothing to export' when no universe is stored", () => {
    renderCrash();

    expect(screen.getByRole("button", { name: "Export backup" })).toBeDisabled();
    expect(screen.getByText("Nothing to export")).toBeInTheDocument();
  });

  it("shows a plain-language message when the download fails", async () => {
    window.localStorage.setItem(V2_KEY, "{}");
    mockUrlApi(() => {
      throw new Error("blocked");
    });

    renderCrash();

    await userEvent.click(screen.getByRole("button", { name: "Export backup" }));

    expect(screen.getByText(/Export failed/)).toBeInTheDocument();
  });
});
