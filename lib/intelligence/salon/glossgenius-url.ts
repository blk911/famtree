// lib/intelligence/salon/glossgenius-url.ts

const GG_SUBDOMAIN_RE = /^([a-z0-9][a-z0-9-]*)\.glossgenius\.com$/i;
const GG_URL_IN_TEXT_RE =
  /https?:\/\/[a-z0-9][a-z0-9-]*\.glossgenius\.com[^\s"'<>]*/gi;
const GG_BARE_HOST_RE =
  /(?:https?:\/\/)?(?:www\.)?([a-z0-9][a-z0-9-]*)\.glossgenius\.com/gi;

export function normalizeGgUrl(url: string): string {
  const u = url.trim();
  return u.startsWith("http") ? u : `https://${u}`;
}

export function glossGeniusSlugFromUrl(url: string): string | null {
  try {
    const u = new URL(normalizeGgUrl(url));
    const m = u.hostname.match(GG_SUBDOMAIN_RE);
    if (!m) return null;
    const slug = m[1].toLowerCase();
    if (slug === "www" || slug === "book") return null;
    return slug;
  } catch {
    return null;
  }
}

export function isGgApexHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, "");
  return h === "glossgenius.com";
}

/** Client booking page: `{slug}.glossgenius.com` (not apex/www). */
export function isGgClientSubdomainUrl(url: string): boolean {
  try {
    const u = new URL(normalizeGgUrl(url));
    return Boolean(glossGeniusSlugFromUrl(u.href));
  } catch {
    return false;
  }
}

export function extractGlossGeniusUrlsFromText(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (raw: string) => {
    try {
      const u = new URL(normalizeGgUrl(raw.split(/[?#]/)[0] ?? raw));
      if (!u.hostname.endsWith("glossgenius.com")) return;
      const key = u.href.toLowerCase().replace(/\/+$/, "");
      if (seen.has(key)) return;
      seen.add(key);
      out.push(u.href.replace(/\/+$/, "") || u.href);
    } catch {
      // skip
    }
  };

  for (const m of Array.from(text.matchAll(GG_URL_IN_TEXT_RE))) add(m[0]);
  for (const m of Array.from(text.matchAll(GG_BARE_HOST_RE))) {
    add(`https://${m[1]}.glossgenius.com/`);
  }

  return out;
}
