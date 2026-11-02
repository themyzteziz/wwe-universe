// US-128 — Relationships evolve naturally based on match results
import { test } from "node:test";
import assert from "node:assert/strict";
import { createBooking, ValidationError } from "../../src/bookings/relationships-evolve-naturally.service.js";

test("creates a booking with status Open", async () => {
  const created = await createBooking({ title: "Write the report" });
  assert.equal(created.status, "Open");
});

test("rejects a booking without a title", async () => {
  await assert.rejects(createBooking({ title: "  " }), ValidationError);
});

test("rejects a title over 120 characters", async () => {
  await assert.rejects(createBooking({ title: "x".repeat(121) }), ValidationError);
});
