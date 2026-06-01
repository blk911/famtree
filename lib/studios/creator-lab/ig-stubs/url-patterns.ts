// lib/studios/creator-lab/ig-stubs/url-patterns.ts
// Generates candidate URLs and search queries for a given IG handle/display name.

export interface CandidateUrl {
  platform: string;
  url: string;
  /** True when this URL was machine-generated from the handle pattern (not found in source evidence).
   *  Generated URLs require positive identity verification before being saved as matched evidence. */
  isGenerated?: boolean;
}

/** Appointment platforms where unverified generated URLs pose a contamination risk.
 *  A generated URL on one of these platforms must be positively verified (IG backlink
 *  or display-name match) before being treated as a confirmed match. */
export const APPOINTMENT_PLATFORMS = new Set([
  "glossgenius",
  "vagaro",
  "styleseat",
  "booksy",
  "fresha",
  "squareup",
  "acuity",
  "mindbody",
]);

// ─── Handle transforms ────────────────────────────────────────────────────────

export function sanitizeHandle(raw: string): string {
  return raw.replace(/^@/, "").toLowerCase().trim();
}

function dotless(h: string): string {
  return h.replace(/\./g, "");
}

function underscoreless(h: string): string {
  return h.replace(/_/g, "");
}

function dashless(h: string): string {
  return h.replace(/-/g, "");
}

// ─── URL pattern generator ────────────────────────────────────────────────────

export function generateCandidateUrls(handle: string): CandidateUrl[] {
  const h  = sanitizeHandle(handle);
  const dl = dotless(h);
  const ul = underscoreless(h);
  const hl = dashless(h);

  const raw: CandidateUrl[] = [
    // GlossGenius — beauty booking, subdomain style
    { platform: "glossgenius", url: `https://${h}.glossgenius.com`,  isGenerated: true },
    { platform: "glossgenius", url: `https://${dl}.glossgenius.com`, isGenerated: true },
    { platform: "glossgenius", url: `https://${ul}.glossgenius.com`, isGenerated: true },
    { platform: "glossgenius", url: `https://${hl}.glossgenius.com`, isGenerated: true },

    // Vagaro — salon/spa booking
    { platform: "vagaro", url: `https://www.vagaro.com/${h}`,  isGenerated: true },
    { platform: "vagaro", url: `https://www.vagaro.com/${ul}`, isGenerated: true },

    // StyleSeat
    { platform: "styleseat", url: `https://www.styleseat.com/m/${h}`,  isGenerated: true },
    { platform: "styleseat", url: `https://www.styleseat.com/m/${ul}`, isGenerated: true },

    // Booksy
    { platform: "booksy", url: `https://booksy.com/en-us/${h}`,    isGenerated: true },
    { platform: "booksy", url: `https://booksy.com/en-us/search`, isGenerated: true },

    // Link-in-bio (lower verification risk — not appointment booking)
    { platform: "linktree",   url: `https://linktr.ee/${h}`,    isGenerated: true },
    { platform: "beacons",    url: `https://beacons.ai/${h}`,   isGenerated: true },
    { platform: "stan",       url: `https://stan.store/${h}`,   isGenerated: true },
    { platform: "msha",       url: `https://msha.ke/${h}`,      isGenerated: true },

    // Square Online
    { platform: "square",     url: `https://${h}.square.site`,  isGenerated: true },
    { platform: "square",     url: `https://${ul}.square.site`, isGenerated: true },
  ];

  // Deduplicate by URL
  const seen = new Set<string>();
  return raw.filter((c) => {
    if (seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });
}

// ─── Search query generator ───────────────────────────────────────────────────

export function generateSearchQueries(handle: string, displayName: string): string[] {
  const h = sanitizeHandle(handle);
  return [
    `"${h}" "glossgenius"`,
    `"${displayName}" "glossgenius"`,
    `"${h}" "vagaro"`,
    `"${h}" "styleseat"`,
    `"${h}" "booksy"`,
    `"${h}" "square.site"`,
    `"${h}" "linktree"`,
    `"${h}" "beacons.ai"`,
    `"${h}" "stan.store"`,
    `"${displayName}" "booking"`,
    `"${displayName}" "salon"`,
    `"${displayName}" "lashes"`,
    `"${displayName}" "nails"`,
    `"${displayName}" "hair"`,
    `"${displayName}" "aesthetic"`,
    `"${displayName}" "injector"`,
  ];
}

// ─── Seed parser (for UI textarea input) ─────────────────────────────────────

export interface ParsedSeed {
  handle: string;
  displayName: string;
}

/**
 * Parses a textarea where each line is one seed.
 * Handles Instagram bio paste format generously:
 *   @handle | Display Name
 *   handle | Display Name
 *   handle, Display Name
 *   handle bio text || more bio         ← double-pipe normalized
 *   handle display name (no separator)  ← first word = handle, rest = display name
 *   @handle                             ← displayName falls back to handle
 */
export function parseSeeds(raw: string): ParsedSeed[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => {
      // Normalize double-pipe (Instagram bio separator) to single pipe
      const normalized = line.replace(/\|\|/g, "|");

      // Split on pipe or comma, drop empty segments
      const sep = normalized.includes("|") ? "|" : normalized.includes(",") ? "," : null;
      const parts = sep
        ? normalized.split(sep).map((p) => p.trim()).filter((p) => p.length > 0)
        : [normalized.trim()];

      const firstPart = parts[0] ?? "";

      // Handle = first word only (the actual IG username, no spaces)
      const words = firstPart.split(/\s+/);
      const handle = sanitizeHandle(words[0] ?? "");

      // Display name priority: second segment > rest of first segment > handle
      const restOfFirst = words.slice(1).join(" ").trim();
      const secondPart = (parts[1] ?? "").trim();
      const displayName = secondPart || restOfFirst || handle;

      return { handle, displayName };
    })
    .filter((s) => s.handle.length > 0);
}
