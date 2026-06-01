// lib/intelligence/salon/glossgenius-handle-resolver.ts
// Probe probable {slug}.glossgenius.com pages from public IG handles / display names.

import { getBookingProviderLabel } from "./provider-detector";

const FETCH_TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BYTES = 500_000;
const MAX_CONCURRENT = 5;
const GG_MARKERS = [
  "glossgenius",
  "book",
  "booking",
  "services",
  "appointment",
  "schedule",
] as const;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export type GlossGeniusResolverSource = "handle_derived" | "display_name_derived" | "none";

export type GlossGeniusHandleResolverInput = {
  instagramHandle?: string;
  displayName?: string | null;
  bio?: string | null;
  website?: string | null;
};

export type GlossGeniusHandleResolverResult = {
  found: boolean;
  provider: "glossgenius" | null;
  providerLabel: "GlossGenius" | null;
  bookingUrl?: string;
  confidence: number;
  source: GlossGeniusResolverSource;
  evidence: string[];
  checkedUrls: string[];
  reason?: string;
};

type Candidate = { url: string; source: "handle_derived" | "display_name_derived" };

/** Normalize handle/slug: lowercase, letters+numbers only. */
export function normalizeGlossGeniusSlug(raw: string): string {
  let s = raw.replace(/^@+/, "").trim().toLowerCase();
  s = s.replace(/[\s_.]+/g, "");
  s = s.replace(/[^a-z0-9]/g, "");
  if (s.length < 3) return "";
  const stripped = s.replace(/[0-9]+$/, "");
  return stripped.length >= 3 ? stripped : s;
}

/** Display name → slug: "Blended By Brandi" → blendedbybrandi */
export function slugFromDisplayName(displayName: string): string {
  const words = displayName
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "";
  return normalizeGlossGeniusSlug(words.join(""));
}

export function generateGlossGeniusSlugCandidates(raw: string): string[] {
  const base = normalizeGlossGeniusSlug(raw);
  if (!base || base.length < 3) return [];

  const out = new Set<string>();
  const add = (s: string) => {
    const slug = normalizeGlossGeniusSlug(s);
    if (slug.length >= 3) out.add(slug);
  };

  add(base);
  add(raw.replace(/^@+/, "").toLowerCase().replace(/_/g, ""));
  add(raw.replace(/^@+/, "").toLowerCase().replace(/\./g, ""));
  add(raw.replace(/^@+/, "").toLowerCase().replace(/_/g, "").replace(/\./g, ""));

  return Array.from(out);
}

function collectCandidates(input: GlossGeniusHandleResolverInput): Candidate[] {
  const seen = new Set<string>();
  const out: Candidate[] = [];
  const push = (slug: string, source: Candidate["source"]) => {
    if (!slug || slug.length < 3) return;
    const url = `https://${slug}.glossgenius.com/`;
    const key = url.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ url, source });
  };

  const handle = (input.instagramHandle ?? "").trim();
  if (handle) {
    for (const slug of generateGlossGeniusSlugCandidates(handle)) {
      push(slug, "handle_derived");
    }
  }

  const display = (input.displayName ?? "").trim();
  if (display && display.toLowerCase() !== handle.toLowerCase()) {
    const dnSlug = slugFromDisplayName(display);
    push(dnSlug, "display_name_derived");
    for (const slug of generateGlossGeniusSlugCandidates(display)) {
      push(slug, "display_name_derived");
    }
  }

  const bio = (input.bio ?? "").trim();
  if (bio) {
    const ggInBio = bio.match(/https?:\/\/([a-z0-9-]+)\.glossgenius\.com/i);
    if (ggInBio?.[1]) push(ggInBio[1].toLowerCase(), "handle_derived");
    const mention = bio.match(/@([a-z0-9._]{2,60})/i);
    if (mention?.[1]) {
      for (const slug of generateGlossGeniusSlugCandidates(mention[1])) {
        push(slug, "handle_derived");
      }
    }
  }

  const website = (input.website ?? "").trim();
  if (website) {
    const ggSite = website.match(/https?:\/\/([a-z0-9-]+)\.glossgenius\.com/i);
    if (ggSite?.[1]) push(ggSite[1].toLowerCase(), "handle_derived");
  }

  return out;
}

function hasGlossGeniusPublicUrl(urls: string[]): boolean {
  return urls.some((u) => /glossgenius\.com/i.test(u));
}

function markersInBody(body: string): string[] {
  const hay = body.toLowerCase();
  return GG_MARKERS.filter((m) => hay.includes(m));
}

function isValidGlossGeniusPage(body: string, httpStatus: number, finalUrl: string): boolean {
  if (httpStatus < 200 || httpStatus >= 400) return false;
  if (!/glossgenius/i.test(finalUrl) && !/glossgenius/i.test(body)) return false;
  const markers = markersInBody(body);
  return markers.length >= 1;
}

function confidenceForMatch(
  markers: string[],
  source: Candidate["source"],
  redirected: boolean,
): number {
  const strong = markers.includes("glossgenius") && markers.length >= 2;
  if (strong) return source === "handle_derived" ? 95 : 85;
  if (redirected && /glossgenius/i.test(markers.join(" "))) return 75;
  if (markers.length >= 1) return source === "display_name_derived" ? 85 : 75;
  return 0;
}

async function readBodyLimited(res: Response): Promise<string> {
  try {
    const buf = await res.arrayBuffer();
    const slice = buf.byteLength > MAX_RESPONSE_BYTES ? buf.slice(0, MAX_RESPONSE_BYTES) : buf;
    return new TextDecoder("utf-8", { fatal: false }).decode(slice);
  } catch {
    return "";
  }
}

async function fetchPage(url: string): Promise<{
  httpStatus: number;
  finalUrl: string;
  body: string;
}> {
  if (!url.startsWith("https://")) {
    return { httpStatus: 0, finalUrl: url, body: "" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
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

    if (res.status === 405 || res.status === 501 || !res.ok) {
      res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers,
        redirect: "follow",
      });
    } else if (!res.headers.get("content-type")?.includes("text")) {
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
    if (!res.ok) return { httpStatus, finalUrl, body: "" };
    const body = await readBodyLimited(res);
    return { httpStatus, finalUrl, body };
  } catch {
    clearTimeout(timer);
    return { httpStatus: 0, finalUrl: url, body: "" };
  }
}

async function probeCandidate(candidate: Candidate): Promise<GlossGeniusHandleResolverResult | null> {
  const fetched = await fetchPage(candidate.url);
  const redirected = fetched.finalUrl.toLowerCase() !== candidate.url.toLowerCase();
  if (!isValidGlossGeniusPage(fetched.body, fetched.httpStatus, fetched.finalUrl)) {
    return null;
  }

  const markers = markersInBody(fetched.body);
  const confidence = confidenceForMatch(markers, candidate.source, redirected);
  if (confidence <= 0) return null;

  const slug = candidate.url.replace(/^https:\/\//, "").replace(/\.glossgenius\.com\/?$/, "");
  const bookingUrl = (fetched.finalUrl || candidate.url).replace(/\/+$/, "");

  return {
    found: true,
    provider: "glossgenius",
    providerLabel: "GlossGenius",
    bookingUrl,
    confidence,
    source: candidate.source,
    evidence: [
      `providerSource: ${candidate.source}`,
      `glossgenius slug match: ${slug}.glossgenius.com`,
      `page markers: ${markers.join(", ")}`,
      redirected ? "redirected to GlossGenius" : "direct subdomain",
    ],
    checkedUrls: [candidate.url],
  };
}

async function runPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R | null>,
): Promise<R | null> {
  let index = 0;
  let found: R | null = null;

  async function worker(): Promise<void> {
    while (!found && index < items.length) {
      const i = index++;
      const item = items[i];
      const result = await fn(item);
      if (result) found = result;
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return found;
}

/**
 * Probe {slug}.glossgenius.com candidates from handle and display name (public URLs only).
 */
export async function resolveGlossGeniusFromHandle(
  input: GlossGeniusHandleResolverInput,
  options?: { publicUrls?: string[] },
): Promise<GlossGeniusHandleResolverResult> {
  const checkedUrls: string[] = [];
  const publicUrls = options?.publicUrls ?? [];
  if (hasGlossGeniusPublicUrl(publicUrls)) {
    return {
      found: false,
      provider: null,
      providerLabel: null,
      confidence: 0,
      source: "none",
      evidence: [],
      checkedUrls,
      reason: "provider_already_detected",
    };
  }

  const candidates = collectCandidates(input);
  if (candidates.length === 0) {
    return {
      found: false,
      provider: null,
      providerLabel: null,
      confidence: 0,
      source: "none",
      evidence: [],
      checkedUrls,
      reason: "not_found",
    };
  }

  for (const c of candidates) checkedUrls.push(c.url);

  const hit = await runPool(candidates, MAX_CONCURRENT, probeCandidate);
  if (hit) {
    return { ...hit, checkedUrls };
  }

  return {
    found: false,
    provider: null,
    providerLabel: null,
    confidence: 0,
    source: "none",
    evidence: [],
    checkedUrls,
    reason: "not_found",
  };
}

/** @deprecated Use resolveGlossGeniusFromHandle — kept for internal enrich mapping */
export function legacyGlossGeniusEnrichFields(
  result: GlossGeniusHandleResolverResult,
): {
  provider: "glossgenius";
  providerLabel: string;
  providerConfidence: number;
  providerSource: "handle_derived" | "display_name_derived";
  bookingUrl: string;
  evidence: string[];
} | null {
  if (!result.found || !result.bookingUrl || result.source === "none") return null;
  return {
    provider: "glossgenius",
    providerLabel: getBookingProviderLabel("glossgenius"),
    providerConfidence: result.confidence,
    providerSource: result.source,
    bookingUrl: result.bookingUrl,
    evidence: result.evidence,
  };
}
