// US-117 — Keep the app functional without paid AI APIs
import { db } from "../db.js";

export interface BookingInput {
  title?: string;
  description?: string;
}

export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
  }
}

export function validateBooking(input: BookingInput) {
  const title = input.title?.trim() ?? "";
  if (!title) throw new ValidationError("title", "Title is required.");
  if (title.length > 120) throw new ValidationError("title", "Title can be at most 120 characters.");
}

export async function createBooking(input: BookingInput) {
  validateBooking(input);
  return db.bookings.insert({ title: input.title!.trim(), description: input.description ?? "", status: "Open" });
}
