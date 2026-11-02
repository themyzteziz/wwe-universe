// US-122 — M3 - Events: the player generate,s accept/reject
import { test } from "node:test";
import assert from "node:assert/strict";
import { createBooking, ValidationError } from "../../src/bookings/m3-events-player.service.js";

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
