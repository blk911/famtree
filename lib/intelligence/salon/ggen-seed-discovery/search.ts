// lib/intelligence/salon/ggen-seed-discovery/search.ts
// Public search result pages only (DuckDuckGo HTML) — no private IG scraping.

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const SEARCH_TIMEOUT_MS = 8_000;
const MAX_URLS_PER_QUERY = 8;

export function buildGgenSearchQueries(input: {
  businessName: string;
  city?: string | null;
  state?: string | null;
}): string[] {
  const loc = [input.city, input.state].filter(Boolean).join(" ").trim();
  const name = input.businessName.trim();
  const queries: string[] = [
    `"${name}" "glossgenius"${loc ? ` "${loc}"` : ""}`,
    `site:glossgenius.com "${name}"`,
  ];
  if (loc) {
    queries.push(`site:glossgenius.com "${name}" ${loc}`);
  }
  return queries;
}

/** Extract glossgenius.com URLs from HTML or plain text. */
export function extractGlossGeniusUrlsFromText(html: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const patterns = [
    /https?:\/\/[a-z0-9-]+\.glossgenius\.com[^\s"'<>]*/gi,
    /(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+)\.glossgenius\.com/gi,
  ];

  for (const re of patterns) {
    for (const m of Array.from(html.matchAll(re))) {
      let url = m[0];
      if (!url.startsWith("http")) url = `https://${url.replace(/^\/\//, "")}`;
      try {
        const u = new URL(url.split(/[\s"'<>]/)[0]!);
        if (!u.hostname.endsWith("glossgenius.com")) continue;
        const clean = `https://${u.hostname}${u.pathname === "/" ? "/" : u.pathname}`.replace(/\/+$/, "") + "/";
        const key = clean.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(clean);
      } catch {
        // skip
      }
    }
  }

  return out;
}

/**
 * Query public DuckDuckGo HTML results (same approach as IG deep-research).
 */
export async function searchPublicWeb(query: string): Promise<string[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!res.ok) return [];
    const html = await res.text();
    const decoded = Array.from(html.matchAll(/uddg=([^"&\s]+)/g))
      .map((m) => {
        try {
          return decodeURIComponent(m[1]!);
        } catch {
          return m[1]!;
        }
      })
      .filter((u) => u.startsWith("http"));
    const fromHtml = extractGlossGeniusUrlsFromText(html);
    const merged = [...decoded, ...fromHtml];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const u of merged) {
      const key = u.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (/glossgenius\.com/i.test(u)) out.push(u);
      if (out.length >= MAX_URLS_PER_QUERY) break;
    }
    return out;
  } catch {
    return [];
  }
}

export async function searchGlossGeniusUrlsForBusiness(input: {
  businessName: string;
  city?: string | null;
  state?: string | null;
  maxQueries?: number;
}): Promise<{ queries: string[]; urls: string[] }> {
  const queries = buildGgenSearchQueries(input).slice(0, input.maxQueries ?? 2);
  const urls: string[] = [];
  const seen = new Set<string>();

  for (const q of queries) {
    for (const u of await searchPublicWeb(q)) {
      const key = u.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      urls.push(u);
    }
  }

  return { queries, urls };
}
