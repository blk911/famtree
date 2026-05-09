// AIH Safe — Request parsing helpers for API route handlers.

import type { NextRequest } from "next/server";

/**
 * Parse the request body as JSON. Returns null if body is empty or unparseable.
 */
export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    const text = await req.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Extract cursor-based pagination params from the query string.
 * cursor: opaque string from a previous response's pagination.cursor field.
 * limit: clamped to [1, 100], default 20.
 */
export function parsePagination(req: NextRequest): { cursor: string | undefined; limit: number } {
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const rawLimit = parseInt(url.searchParams.get("limit") ?? "20", 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 20;
  return { cursor, limit };
}

export function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}
