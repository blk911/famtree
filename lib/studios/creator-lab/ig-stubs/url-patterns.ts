// lib/studios/creator-lab/ig-stubs/url-patterns.ts
// Generates candidate URLs and search queries for a given IG handle/display name.

export interface CandidateUrl {
  platform: string;
  url: string;
}

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
    { platform: "glossgenius", url: `https://${h}.glossgenius.com` },
    { platform: "glossgenius", url: `https://${dl}.glossgenius.com` },
    { platform: "glossgenius", url: `https://${ul}.glossgenius.com` },
    { platform: "glossgenius", url: `https://${hl}.glossgenius.com` },

    // Vagaro — salon/spa booking
    { platform: "vagaro", url: `https://www.vagaro.com/${h}` },
    { platform: "vagaro", url: `https://www.vagaro.com/${ul}` },

    // StyleSeat
    { platform: "styleseat", url: `https://www.styleseat.com/m/${h}` },
    { platform: "styleseat", url: `https://www.styleseat.com/m/${ul}` },

    // Booksy
    { platform: "booksy", url: `https://booksy.com/en-us/${h}` },
    { platform: "booksy", url: `https://booksy.com/en-us/search` },

    // Link-in-bio
    { platform: "linktree",   url: `https://linktr.ee/${h}` },
    { platform: "beacons",    url: `https://beacons.ai/${h}` },
    { platform: "stan",       url: `https://stan.store/${h}` },

    // Square Online
    { platform: "square",     url: `https://${h}.square.site` },
    { platform: "square",     url: `https://${ul}.square.site` },
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
 * Accepted formats:
 *   @handle | Display Name
 *   handle | Display Name
 *   handle, Display Name
 *   @handle           ← displayName falls back to handle
 */
export function parseSeeds(raw: string): ParsedSeed[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => {
      const sep = line.includes("|") ? "|" : ",";
      const parts = line.split(sep).map((p) => p.trim());
      const handle = sanitizeHandle(parts[0] ?? "");
      const displayName = parts[1] ?? handle;
      return { handle, displayName };
    })
    .filter((s) => s.handle.length > 0);
}
