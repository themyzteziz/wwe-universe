import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, validateSettings } from "./constants.js";

describe("validateSettings", () => {
  it("accepts the defaults and an empty partial", () => {
    expect(validateSettings(DEFAULT_SETTINGS).ok).toBe(true);
    const r = validateSettings({});
    expect(r.ok).toBe(true);
    expect(r.value).toEqual(DEFAULT_SETTINGS);
  });

  it("rejects non-objects without throwing", () => {
    for (const bad of [null, undefined, 3, "x", []]) {
      expect(validateSettings(bad).ok).toBe(false);
    }
  });

  it("enforces integer 0-100 on sliders", () => {
    expect(validateSettings({ chaos: 0 }).ok).toBe(true);
    expect(validateSettings({ chaos: 100 }).ok).toBe(true);
    for (const bad of [-1, 101, 5.5, "50", NaN]) {
      expect(validateSettings({ eventFrequency: bad }).ok).toBe(false);
    }
  });

  it("enforces booleans", () => {
    expect(validateSettings({ autoPropose: "yes" }).ok).toBe(false);
    expect(validateSettings({ aiEnabled: 1 }).ok).toBe(false);
    expect(validateSettings({ autoPropose: false, aiEnabled: true }).ok).toBe(true);
  });

  it("allows seed null or a safe integer >= 0 only", () => {
    expect(validateSettings({ seed: null }).ok).toBe(true);
    expect(validateSettings({ seed: 0 }).ok).toBe(true);
    for (const bad of [-1, 1.5, "7", 2 ** 60]) {
      expect(validateSettings({ seed: bad }).ok).toBe(false);
    }
  });

  it("allows an empty or https endpoint and rejects http or junk", () => {
    expect(validateSettings({ aiEndpoint: "" }).ok).toBe(true);
    expect(validateSettings({ aiEndpoint: "https://example.com/describe" }).ok).toBe(true);
    for (const bad of ["http://example.com", "not a url", "ftp://x.com", 5]) {
      const r = validateSettings({ aiEndpoint: bad });
      expect(r.ok).toBe(false);
      expect(r.errors[0]).toMatch(/aiEndpoint/);
    }
  });
});
