// lib/markets/normalize-identity.ts

export function normalizeOperatorName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePhoneKeys(phones: string[]): string[] {
  const keys = new Set<string>();
  for (const phone of phones) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length >= 10) keys.add(digits.slice(-10));
  }
  return Array.from(keys).sort();
}

export function normalizeWebsiteDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function normalizeSocialHandles(socialLinks: string[]): string[] {
  const handles = new Set<string>();
  for (const link of socialLinks) {
    const trimmed = link.trim();
    if (!trimmed) continue;
    try {
      const url = new URL(trimmed);
      const host = url.hostname.replace(/^www\./, "").toLowerCase();
      const parts = url.pathname.split("/").filter(Boolean);
      if (host.includes("instagram.com") && parts[0]) {
        handles.add(`instagram:${parts[0]!.toLowerCase()}`);
      } else if (host.includes("facebook.com") && parts[0]) {
        handles.add(`facebook:${parts[0]!.toLowerCase()}`);
      } else if (host.includes("tiktok.com") && parts[0]?.startsWith("@")) {
        handles.add(`tiktok:${parts[0]!.slice(1).toLowerCase()}`);
      }
    } catch {
      // skip malformed URLs
    }
  }
  return Array.from(handles).sort();
}

export function normalizeBookingKey(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  const host = normalizeWebsiteDomain(trimmed);
  if (host.endsWith(".glossgenius.com")) {
    const slug = host.split(".")[0];
    return slug ? `glossgenius:${slug}` : "";
  }
  if (host.includes("sola") || host.includes("vagaro") || host.includes("styleseat")) {
    return `${host}${new URL(trimmed).pathname.replace(/\/$/, "").toLowerCase()}`;
  }
  try {
    return new URL(trimmed).href.replace(/\/$/, "").toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}
