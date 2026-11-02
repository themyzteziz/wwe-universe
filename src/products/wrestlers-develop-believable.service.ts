// US-103 — Wrestlers develop believable histories
import { db } from "../db.js";

export interface ProductInput {
  title?: string;
  description?: string;
}

export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
  }
}

export function validateProduct(input: ProductInput) {
  const title = input.title?.trim() ?? "";
  if (!title) throw new ValidationError("title", "Title is required.");
  if (title.length > 120) throw new ValidationError("title", "Title can be at most 120 characters.");
}

export async function createProduct(input: ProductInput) {
  validateProduct(input);
  return db.products.insert({ title: input.title!.trim(), description: input.description ?? "", status: "Open" });
}
