// lib/intelligence/salon/glossgenius-handle-resolver.ts
// Probe probable {slug}.glossgenius.com pages when no public booking URL was found.
// Resolver/enrichment only — not hashtag harvest.

import { getBookingProviderLabel } from "./provider-detector";

const FETCH_TIMEOUT_MS = 5_000;
const STRIP_TRAILING_NUMBERS = true;

const GG_MARKERS = [
  "glossgenius",
  "booking",
  "services",
  "appointment",
  "schedule",
] as const;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export type GlossGeniusHandleResolverInput = {
  instagramHandle: string;
  displayName?: string | null;
  website?: string | null;
  bio?: string | null;
};

export type GlossGeniusHandleResolverResult = {
  provider: "glossgenius";
  providerLabel: string;
  providerConfidence: number;
  providerSource: "handle_derived";
  bookingUrl: string;
  evidence: string[];
};

function sanitizeHandle(raw: string): string {
  return raw.replace(/^@+/, "").toLowerCase().trim();
}

/** Build GlossGenius subdomain slug variants from a handle-like string. */
export function generateGlossGeniusSlugCandidates(raw: string): string[] {
  const base = sanitizeHandle(raw);
  if (!base) return [];

  const out = new Set<string>();
  const add = (s: string) => {
    const slug = s.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (slug.length >= 3) out.add(slug);
  };

  add(base);
  add(base.replace(/_/g, ""));
  add(base.replace(/\./g, ""));
  add(base.replace(/_/g, "").replace(/\./g, ""));

  if (STRIP_TRAILING_NUMBERS) {
    const noNums = base.replace(/[0-9]+$/, "");
    add(noNums);
    add(noNums.replace(/_/g, "").replace(/\./g, ""));
  }

  return Array.from(out);
}

function collectSlugCandidates(input: GlossGeniusHandleResolverInput): string[] {
  const slugs = new Set<string>();

  for (const s of generateGlossGeniusSlugCandidates(input.instagramHandle)) {
    slugs.add(s);
  }

  const bio = (input.bio ?? "").trim();
  if (bio) {
    const igMention = bio.match(/@([a-z0-9._]{2,60})/i);
    if (igMention?.[1]) {
      for (const s of generateGlossGeniusSlugCandidates(igMention[1])) slugs.add(s);
    }
    const ggInBio = bio.match(/https?:\/\/([a-z0-9-]+)\.glossgenius\.com/i);
    if (ggInBio?.[1]) slugs.add(ggInBio[1].toLowerCase());
  }

  const website = (input.website ?? "").trim();
  if (website) {
    const ggSite = website.match(/https?:\/\/([a-z0-9-]+)\.glossgenius\.com/i);
    if (ggSite?.[1]) slugs.add(ggSite[1].toLowerCase());
  }

  return Array.from(slugs);
}

function glossGeniusUrls(slugs: string[]): string[] {
  return slugs.map((slug) => `https://${slug}.glossgenius.com`);
}

function hasGlossGeniusPublicUrl(urls: string[]): boolean {
  return urls.some((u) => /glossgenius\.com/i.test(u));
}

function markersInBody(body: string): string[] {
  const hay = body.toLowerCase();
  return GG_MARKERS.filter((m) => hay.includes(m));
}

function isValidGlossGeniusPage(body: string, httpStatus: number): boolean {
  if (httpStatus < 200 || httpStatus >= 400) return false;
  const found = markersInBody(body);
  return found.includes("glossgenius") && found.length >= 2;
}

function confidenceFromMarkers(markers: string[]): number {
  if (markers.includes("glossgenius") && markers.length >= 4) return 72;
  if (markers.includes("glossgenius") && markers.length >= 3) return 65;
  return 58;
}

async function fetchPage(url: string): Promise<{
  ok: boolean;
  httpStatus: number;
  finalUrl: string;
  body: string;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const base = { ok: false, httpStatus: 0, finalUrl: url, body: "" };

  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };

  try {
    let res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers,
      redirect: "follow",
    });

    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers,
        redirect: "follow",
      });
    } else if (res.ok && !res.headers.get("content-type")?.includes("text")) {
      res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers,
        redirect: "follow",
      });
    } else if (!res.ok) {
      res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers,
        redirect: "follow",
      });
    }

    clearTimeout(timer);
    const finalUrl = res.url || url;
    const httpStatus = res.status;

    if (!res.ok) {
      return { ...base, httpStatus, finalUrl };
    }

    const body = await res.text();
    return { ok: true, httpStatus, finalUrl, body };
  } catch {
    clearTimeout(timer);
    return base;
  }
}

/**
 * Probe {slug}.glossgenius.com candidates derived from the IG handle (and bio/website hints).
 */
export async function resolveGlossGeniusFromHandle(
  input: GlossGeniusHandleResolverInput,
  options?: { publicUrls?: string[] },
): Promise<GlossGeniusHandleResolverResult | null> {
  const publicUrls = options?.publicUrls ?? [];
  if (hasGlossGeniusPublicUrl(publicUrls)) {
    return null;
  }

  const slugs = collectSlugCandidates(input);
  const urls = glossGeniusUrls(slugs);

  for (const url of urls) {
    const fetched = await fetchPage(url);
    if (!isValidGlossGeniusPage(fetched.body, fetched.httpStatus)) continue;

    const markers = markersInBody(fetched.body);
    const slug = url.replace(/^https:\/\//, "").replace(/\.glossgenius\.com\/?$/, "");

    return {
      provider: "glossgenius",
      providerLabel: getBookingProviderLabel("glossgenius"),
      providerConfidence: confidenceFromMarkers(markers),
      providerSource: "handle_derived",
      bookingUrl: fetched.finalUrl.replace(/\/+$/, "") || url,
      evidence: [
        "providerSource: handle_derived",
        `glossgenius handle match: ${slug}.glossgenius.com`,
        `page markers: ${markers.join(", ")}`,
      ],
    };
  }

  return null;
}
