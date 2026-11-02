// US-104 — Surprise emerges from simulation rules and prior events
import { test } from "node:test";
import assert from "node:assert/strict";
import { createProduct, ValidationError } from "../../src/products/surprise-emerges-simulation.service.js";

test("creates a product with status Open", async () => {
  const created = await createProduct({ title: "Write the report" });
  assert.equal(created.status, "Open");
});

test("rejects a product without a title", async () => {
  await assert.rejects(createProduct({ title: "  " }), ValidationError);
});

test("rejects a title over 120 characters", async () => {
  await assert.rejects(createProduct({ title: "x".repeat(121) }), ValidationError);
});
