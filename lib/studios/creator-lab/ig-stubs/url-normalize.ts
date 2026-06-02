// lib/studios/creator-lab/ig-stubs/url-normalize.ts

/** Ensure bare domains and protocol-relative links become fetchable https URLs. */
export function normalizePublicUrl(raw: string): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      return new URL(trimmed).href;
    } catch {
      return null;
    }
  }
  if (trimmed.startsWith("//")) {
    try {
      return new URL(`https:${trimmed}`).href;
    } catch {
      return null;
    }
  }
  if (/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}/i.test(trimmed)) {
    try {
      return new URL(`https://${trimmed.replace(/^www\./i, "www.")}`).href;
    } catch {
      return null;
    }
  }
  return null;
}

export function uniquePublicUrls(urls: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const u = raw ? normalizePublicUrl(raw) ?? (raw.startsWith("http") ? raw : null) : null;
    if (!u) continue;
    const key = u.toLowerCase().replace(/\/+$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u);
  }
  return out;
}
