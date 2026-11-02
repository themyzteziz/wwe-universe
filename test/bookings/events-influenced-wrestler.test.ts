// US-111 — Events are influenced by wrestler history
import { test } from "node:test";
import assert from "node:assert/strict";
import { createBooking, ValidationError } from "../../src/bookings/events-influenced-wrestler.service.js";

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
