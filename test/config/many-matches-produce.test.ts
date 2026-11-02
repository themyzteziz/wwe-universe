// US-110 — Many matches produce no event
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadManyMatchesProduceSettings } from "../../src/config/many-matches-produce.js";

test("defaults when nothing is set", () => {
  assert.deepEqual(loadManyMatchesProduceSettings({}), { enabled: true });
});

test("rejects an invalid value", () => {
  assert.throws(() => loadManyMatchesProduceSettings({ MANY_MATCHES_PRODUCE_ENABLED: "yes" }));
});
