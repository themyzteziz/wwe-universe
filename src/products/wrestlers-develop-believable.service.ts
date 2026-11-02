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
  // TODO: validation
}

export async function createProduct(input: ProductInput) {
  validateProduct(input);
  return db.products.insert({ title: input.title!.trim(), description: input.description ?? "", status: "Open" });
}
