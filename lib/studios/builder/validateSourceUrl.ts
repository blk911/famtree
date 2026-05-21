import type { StudioSourceType } from "@/types/studios/builder";
import { STUDIO_SOURCE_TYPES } from "@/types/studios/builder";

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
];

const AUTH_PATH_HINTS = ["/login", "/signin", "/signup", "/oauth", "/auth/"];

export type SourceUrlValidationResult =
  | { ok: true; normalizedUrl: string }
  | { ok: false; error: string };

export function isStudioSourceType(value: string): value is StudioSourceType {
  return (STUDIO_SOURCE_TYPES as readonly string[]).includes(value);
}

export function validateStudioSourceUrl(
  sourceType: StudioSourceType,
  url: string | undefined | null,
): SourceUrlValidationResult {
  if (sourceType === "manual") {
    return { ok: true, normalizedUrl: "" };
  }

  const trimmed = (url ?? "").trim();
  if (!trimmed) {
    return { ok: false, error: "URL is required for this source type." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return { ok: false, error: "Enter a valid URL (https://…)." };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, error: "Only http and https URLs are allowed." };
  }

  if (parsed.protocol === "http:") {
    parsed.protocol = "https:";
  }

  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOST_PATTERNS.some((re) => re.test(host))) {
    return { ok: false, error: "Local or private network URLs are not allowed." };
  }

  const pathLower = parsed.pathname.toLowerCase();
  if (AUTH_PATH_HINTS.some((hint) => pathLower.includes(hint))) {
    return { ok: false, error: "Auth or login URLs cannot be used as public sources." };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: "URLs with embedded credentials are not allowed." };
  }

  return { ok: true, normalizedUrl: parsed.toString() };
}
