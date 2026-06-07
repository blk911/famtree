// lib/operators/sources/sola/profile-url-utils.ts

export const SOLA_BOOK_ORIGIN = "https://book.solasalonstudios.com";

export function normalizeSolaName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeSolaProfileUrl(url?: string): string | undefined {
  if (!url?.trim()) return undefined;
  try {
    const parsed = new URL(url.trim());
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url.trim().replace(/\/$/, "");
  }
}

/** Extract profile slug from Sola book URLs (absolute or relative). */
export function extractProfileSlug(profileUrl?: string): string | undefined {
  if (!profileUrl?.trim()) return undefined;

  let pathname: string;
  try {
    const parsed = new URL(profileUrl.trim(), SOLA_BOOK_ORIGIN);
    pathname = parsed.pathname;
  } catch {
    pathname = profileUrl.trim();
  }

  const segment = pathname.replace(/^\/+/, "").split("/").filter(Boolean)[0];
  return segment?.toLowerCase();
}
