// lib/intelligence/salon/glossgenius-handle-resolver.ts
// Probe probable {slug}.glossgenius.com pages from public IG handles / display names.

import { getBookingProviderLabel } from "./provider-detector";
import type { GgCandidateDescriptor, GgProbeLogEntry } from "./gg-resolver-types";

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
  "provider",
  "business",
] as const;

const SALON_STRIP_WORDS = [
  "hair",
  "nails",
  "nail",
  "beauty",
  "esthetic",
  "esthetics",
  "lashes",
  "lash",
  "brows",
  "brow",
  "studio",
  "salon",
  "spa",
];

const LOCATION_WORDS = new Set([
  "nyc",
  "la",
  "atl",
  "dfw",
  "dallas",
  "houston",
  "austin",
  "miami",
  "chicago",
  "denver",
  "seattle",
  "phoenix",
  "vegas",
  "orlando",
  "tampa",
  "charlotte",
  "nashville",
  "portland",
  "sandiego",
  "san",
  "diego",
  "francisco",
  "angeles",
  "york",
  "brooklyn",
  "texas",
  "florida",
  "california",
  "georgia",
]);

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
  candidates?: GgCandidateDescriptor[];
  probeLog?: GgProbeLogEntry[];
  statusCodes?: number[];
  markersFound?: string[];
};

type Candidate = GgCandidateDescriptor;

/** Normalize handle/slug: lowercase, letters+numbers only. */
export function normalizeGlossGeniusSlug(raw: string): string {
  let s = raw.replace(/^@+/, "").trim().toLowerCase();
  s = s.replace(/[\s_.]+/g, "");
  s = s.replace(/[^a-z0-9]/g, "");
  if (s.length < 3) return "";
  const stripped = s.replace(/[0-9]+$/, "");
  return stripped.length >= 3 ? stripped : s;
}

function stripSalonPrefixWords(slug: string): string {
  let s = slug;
  let changed = true;
  while (changed && s.length >= 5) {
    changed = false;
    for (const word of SALON_STRIP_WORDS) {
      if (s.startsWith(word) && s.length > word.length + 3) {
        s = s.slice(word.length);
        changed = true;
      }
      if (s.endsWith(word) && s.length > word.length + 3) {
        s = s.slice(0, -word.length);
        changed = true;
      }
    }
  }
  return s.length >= 3 ? s : slug;
}

/** Display name → slug, dropping location tokens when safe. */
export function slugFromDisplayName(displayName: string): string {
  const words = displayName
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase())
    .filter((w) => !LOCATION_WORDS.has(w) && w.length > 1);

  if (words.length === 0) return "";
  const joined = words.join("");
  return normalizeGlossGeniusSlug(joined);
}

export function generateGlossGeniusSlugCandidates(raw: string): string[] {
  const base = normalizeGlossGeniusSlug(raw);
  if (!base || base.length < 3) return [];

  const out = new Set<string>();
  const add = (s: string) => {
    const slug = normalizeGlossGeniusSlug(s);
    if (slug.length >= 3) out.add(slug);
    const stripped = stripSalonPrefixWords(slug);
    if (stripped.length >= 3) out.add(stripped);
  };

  add(base);
  const lower = raw.replace(/^@+/, "").toLowerCase().trim();
  add(lower);
  add(lower.replace(/_/g, ""));
  add(lower.replace(/\./g, ""));
  add(lower.replace(/_/g, "").replace(/\./g, ""));
  add(lower.replace(/_+$/, ""));

  return Array.from(out);
}

export function collectGlossGeniusCandidates(
  input: GlossGeniusHandleResolverInput,
): GgCandidateDescriptor[] {
  const seen = new Set<string>();
  const out: Candidate[] = [];
  const push = (slug: string, source: Candidate["source"]) => {
    if (!slug || slug.length < 3) return;
    const url = `https://${slug}.glossgenius.com/`;
    const key = url.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ url, slug, source });
  };

  const handle = (input.instagramHandle ?? "").trim();
  if (handle) {
    for (const slug of generateGlossGeniusSlugCandidates(handle)) {
      push(slug, "handle_derived");
    }
  }

  const display = (input.displayName ?? "").trim();
  if (display) {
    const dnSlug = slugFromDisplayName(display);
    if (dnSlug) push(dnSlug, "display_name_derived");
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

function markersInBody(body: string, titleHint?: string): string[] {
  const hay = `${body} ${titleHint ?? ""}`.toLowerCase();
  return GG_MARKERS.filter((m) => hay.includes(m));
}

function titleFromHtml(body: string): string {
  const m = body.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1]?.trim() ?? "";
}

function evaluateProbe(
  fetched: { httpStatus: number; finalUrl: string; body: string; timedOut: boolean },
  candidate: Candidate,
): { valid: boolean; confidence: number; markers: string[]; weakHostOnly: boolean } {
  if (fetched.timedOut) {
    return { valid: false, confidence: 0, markers: [], weakHostOnly: false };
  }

  const status = fetched.httpStatus;
  const okStatus = status >= 200 && status < 400;
  const hostGg =
    /glossgenius\.com/i.test(fetched.finalUrl) ||
    /glossgenius\.com/i.test(candidate.url);

  if (!okStatus || !hostGg) {
    return { valid: false, confidence: 0, markers: [], weakHostOnly: false };
  }

  const title = titleFromHtml(fetched.body);
  const markers = markersInBody(fetched.body, title);
  const strong = markers.includes("glossgenius") && markers.length >= 2;
  const hasBookingMarker = markers.some((m) =>
    ["book", "booking", "services", "appointment", "schedule"].includes(m),
  );

  if (strong || (markers.includes("glossgenius") && hasBookingMarker)) {
    const conf =
      candidate.source === "handle_derived"
        ? markers.length >= 3
          ? 95
          : 88
        : 85;
    return { valid: true, confidence: conf, markers, weakHostOnly: false };
  }

  if (hostGg && fetched.body.length === 0 && okStatus) {
    return { valid: true, confidence: 62, markers: ["glossgenius-host"], weakHostOnly: true };
  }

  if (hostGg && okStatus) {
    return { valid: true, confidence: 58, markers: markers.length ? markers : ["glossgenius-host"], weakHostOnly: true };
  }

  return { valid: false, confidence: 0, markers, weakHostOnly: false };
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
  timedOut: boolean;
  fetchError: boolean;
}> {
  if (!url.startsWith("https://")) {
    return { httpStatus: 0, finalUrl: url, body: "", timedOut: false, fetchError: true };
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
    if (!res.ok) return { httpStatus, finalUrl, body: "", timedOut: false, fetchError: false };
    const body = await readBodyLimited(res);
    return { httpStatus, finalUrl, body, timedOut: false, fetchError: false };
  } catch (e) {
    clearTimeout(timer);
    const timedOut = e instanceof Error && e.name === "AbortError";
    return { httpStatus: 0, finalUrl: url, body: "", timedOut, fetchError: !timedOut };
  }
}

async function probeCandidateFull(candidate: Candidate): Promise<{
  hit: GlossGeniusHandleResolverResult | null;
  log: GgProbeLogEntry;
}> {
  const fetched = await fetchPage(candidate.url);
  const evald = evaluateProbe(fetched, candidate);

  const log: GgProbeLogEntry = {
    url: candidate.url,
    httpStatus: fetched.httpStatus,
    finalUrl: fetched.finalUrl,
    markersFound: evald.markers,
    error: fetched.timedOut
      ? "timeout"
      : fetched.fetchError
        ? "fetch_error"
        : undefined,
  };

  if (!evald.valid) {
    return { hit: null, log };
  }

  const bookingUrl = (fetched.finalUrl || candidate.url).replace(/\/+$/, "");
  return {
    hit: {
      found: true,
      provider: "glossgenius",
      providerLabel: "GlossGenius",
      bookingUrl,
      confidence: evald.confidence,
      source: candidate.source,
      evidence: [
        `providerSource: ${candidate.source}`,
        `glossgenius slug match: ${candidate.slug}.glossgenius.com`,
        `page markers: ${evald.markers.join(", ")}`,
        evald.weakHostOnly ? "weak host-only match (2xx glossgenius.com)" : "strong marker match",
      ],
      checkedUrls: [candidate.url],
      reason: evald.weakHostOnly ? "weak_host_match" : "found",
    },
    log,
  };
}

async function runPoolCandidates(
  candidates: Candidate[],
  stopOnFirstHit: boolean,
): Promise<{
  hit: GlossGeniusHandleResolverResult | null;
  probeLog: GgProbeLogEntry[];
}> {
  const probeLog: GgProbeLogEntry[] = [];
  let hit: GlossGeniusHandleResolverResult | null = null;
  let index = 0;

  async function worker(): Promise<void> {
    while (index < candidates.length) {
      if (stopOnFirstHit && hit) return;
      const i = index++;
      const { hit: candidateHit, log } = await probeCandidateFull(candidates[i]);
      probeLog.push(log);
      if (candidateHit && !hit) {
        hit = {
          ...candidateHit,
          checkedUrls: candidates.map((c) => c.url),
          probeLog: [...probeLog],
        };
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(MAX_CONCURRENT, candidates.length) },
    () => worker(),
  );
  await Promise.all(workers);

  return { hit, probeLog };
}

/**
 * Probe all candidates and return full debug log (test endpoint).
 */
export async function debugGlossGeniusResolver(
  input: GlossGeniusHandleResolverInput,
): Promise<GlossGeniusHandleResolverResult> {
  const candidates = collectGlossGeniusCandidates(input);
  if (candidates.length === 0) {
    return emptyResult([], [], "no_candidates");
  }

  const { hit, probeLog } = await runPoolCandidates(candidates, false);
  const statusCodes = probeLog.map((p) => p.httpStatus);
  const markersFound = Array.from(new Set(probeLog.flatMap((p) => p.markersFound)));

  if (hit) {
    return {
      ...hit,
      candidates,
      probeLog,
      statusCodes,
      markersFound,
      checkedUrls: candidates.map((c) => c.url),
    };
  }

  const hadTimeout = probeLog.some((p) => p.error === "timeout");
  return {
    ...emptyResult(
      candidates.map((c) => c.url),
      probeLog,
      hadTimeout ? "timeout" : "not_found",
    ),
    candidates,
    statusCodes,
    markersFound,
  };
}

function emptyResult(
  checkedUrls: string[],
  probeLog: GgProbeLogEntry[],
  reason: string,
): GlossGeniusHandleResolverResult {
  return {
    found: false,
    provider: null,
    providerLabel: null,
    confidence: 0,
    source: "none",
    evidence: [],
    checkedUrls,
    probeLog,
    reason,
  };
}

/**
 * Probe {slug}.glossgenius.com candidates from handle and display name (public URLs only).
 */
export async function resolveGlossGeniusFromHandle(
  input: GlossGeniusHandleResolverInput,
  options?: { publicUrls?: string[] },
): Promise<GlossGeniusHandleResolverResult> {
  const publicUrls = options?.publicUrls ?? [];
  if (hasGlossGeniusPublicUrl(publicUrls)) {
    return emptyResult([], [], "provider_already_detected");
  }

  const candidates = collectGlossGeniusCandidates(input);
  if (candidates.length === 0) {
    return emptyResult([], [], "no_handle");
  }

  const { hit, probeLog } = await runPoolCandidates(candidates, true);
  const checkedUrls = candidates.map((c) => c.url);

  if (hit) {
    return {
      ...hit,
      candidates,
      probeLog,
      statusCodes: probeLog.map((p) => p.httpStatus),
      markersFound: Array.from(new Set(probeLog.flatMap((p) => p.markersFound))),
      checkedUrls,
    };
  }

  const hadTimeout = probeLog.some((p) => p.error === "timeout");
  const hadError = probeLog.some((p) => p.error === "fetch_error");

  return {
    ...emptyResult(checkedUrls, probeLog, hadTimeout ? "timeout" : hadError ? "error" : "not_found"),
    candidates,
    statusCodes: probeLog.map((p) => p.httpStatus),
    markersFound: Array.from(new Set(probeLog.flatMap((p) => p.markersFound))),
  };
}

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
