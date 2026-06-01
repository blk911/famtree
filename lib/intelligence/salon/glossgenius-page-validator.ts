// lib/intelligence/salon/glossgenius-page-validator.ts
// HTTP validation for GlossGenius client booking pages (public URLs only).

import type { BookingProviderSource } from "./enrich-booking-provider";

const FETCH_TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BYTES = 500_000;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export type GgValidationStatus =
  | "not_attempted"
  | "candidate_only"
  | "confirmed_client_page"
  | "generic_glossgenius_page"
  | "not_found"
  | "redirect_home"
  | "blocked"
  | "timeout"
  | "error";

export type GgValidationSource =
  | "direct_url"
  | "link_in_bio"
  | "handle_derived"
  | "display_name_derived";

export type GgPageValidationInput = {
  url: string;
  slugHint?: string | null;
  displayNameHint?: string | null;
  handleHint?: string | null;
  discoverySource: GgValidationSource;
};

export type GgPageValidationResult = {
  status: GgValidationStatus;
  httpStatus: number;
  finalUrl: string;
  positiveMarkers: string[];
  negativeMarkers: string[];
  reason: string;
  confirmed: boolean;
  suggestedConfidence: number;
};

const POSITIVE_PATTERNS: Array<{ id: string; re: RegExp }> = [
  { id: "book_now", re: /book\s*now/i },
  { id: "services", re: /\bservices\b/i },
  { id: "select_a_service", re: /select\s+a\s+service/i },
  { id: "appointment", re: /\bappointment/i },
  { id: "glossgenius_booking", re: /glossgenius/i },
  { id: "schedule", re: /\bschedule\b/i },
  { id: "book_appointment", re: /book\s+(?:an?\s+)?appointment/i },
  { id: "provider_json", re: /"provider(?:Name|_name)?"\s*:/i },
  { id: "business_json", re: /"business(?:Name|_name)?"\s*:/i },
];

const NEGATIVE_PATTERNS: Array<{ id: string; re: RegExp }> = [
  { id: "free_trial", re: /start\s+your\s+free\s+trial/i },
  { id: "grow_business", re: /grow\s+your\s+business/i },
  { id: "salon_spa_software", re: /salon\s+and\s+spa\s+software/i },
  { id: "sign_up", re: /\bsign\s*up\b/i },
  { id: "login", re: /\blogin\b/i },
  { id: "marketing_home", re: /glossgenius\s*\|\s*salon\s+and\s+spa\s+software/i },
  { id: "pricing_plans", re: /\bpricing\b.*\bplans\b/i },
  { id: "get_started", re: /get\s+started\s+free/i },
];

const MARKETING_PATH_PREFIXES = [
  "/signup",
  "/sign-up",
  "/login",
  "/pricing",
  "/plans",
  "/demo",
  "/about",
  "/features",
  "/marketing",
  "/home",
];

function titleFromHtml(body: string): string {
  const m = body.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1]?.trim() ?? "";
}

function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

function slugFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const m = u.hostname.match(/^([a-z0-9-]+)\.glossgenius\.com$/i);
    return m?.[1]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

function isApexGlossGeniusHost(host: string): boolean {
  const h = normalizeHost(host);
  return h === "glossgenius.com";
}

function isMarketingPath(pathname: string): boolean {
  const p = pathname.toLowerCase();
  return MARKETING_PATH_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

function scanMarkers(body: string, title: string): {
  positive: string[];
  negative: string[];
} {
  const hay = `${body} ${title}`.toLowerCase();
  const positive = POSITIVE_PATTERNS.filter((p) => p.re.test(hay)).map((p) => p.id);
  const negative = NEGATIVE_PATTERNS.filter((p) => p.re.test(hay)).map((p) => p.id);
  return { positive, negative };
}

function titleMatchesHints(
  title: string,
  slugHint?: string | null,
  displayNameHint?: string | null,
  handleHint?: string | null,
): boolean {
  const t = title.toLowerCase();
  if (!t) return false;
  const slug = (slugHint ?? "").toLowerCase();
  if (slug.length >= 3 && t.includes(slug.replace(/-/g, " "))) return true;
  if (slug.length >= 3 && t.includes(slug)) return true;
  const display = (displayNameHint ?? "").trim();
  if (display.length >= 3) {
    const words = display
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 3);
    if (words.length > 0 && words.every((w) => t.includes(w.toLowerCase()))) return true;
  }
  const handle = (handleHint ?? "").replace(/^@+/, "").toLowerCase();
  if (handle.length >= 4 && t.includes(handle.slice(0, Math.min(handle.length, 12)))) return true;
  return false;
}

function hasStrongBookingSignals(positive: string[]): boolean {
  const bookingIds = new Set([
    "book_now",
    "services",
    "select_a_service",
    "appointment",
    "book_appointment",
    "schedule",
  ]);
  return positive.filter((p) => bookingIds.has(p)).length >= 2;
}

function confidenceForConfirmed(
  source: GgValidationSource,
  positive: string[],
  titleMatch: boolean,
): number {
  const bookingStrong = hasStrongBookingSignals(positive);
  if (source === "direct_url" || source === "link_in_bio") {
    return bookingStrong && titleMatch ? 100 : bookingStrong ? 98 : 95;
  }
  if (source === "display_name_derived") {
    if (titleMatch && bookingStrong) return 90;
    if (titleMatch || bookingStrong) return 82;
    return 75;
  }
  if (titleMatch && bookingStrong) return 88;
  if (titleMatch || bookingStrong) return 80;
  return 75;
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

export async function fetchGgPage(url: string): Promise<{
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

export function classifyGgPageContent(input: {
  httpStatus: number;
  finalUrl: string;
  body: string;
  timedOut: boolean;
  fetchError: boolean;
  requestedUrl: string;
  slugHint?: string | null;
  displayNameHint?: string | null;
  handleHint?: string | null;
  discoverySource: GgValidationSource;
}): GgPageValidationResult {
  const slugFromRequested = slugFromUrl(input.requestedUrl) ?? slugFromUrl(input.finalUrl);

  if (input.timedOut) {
    return {
      status: "timeout",
      httpStatus: 0,
      finalUrl: input.finalUrl,
      positiveMarkers: [],
      negativeMarkers: [],
      reason: "Request timed out",
      confirmed: false,
      suggestedConfidence: 0,
    };
  }

  if (input.fetchError) {
    return {
      status: "error",
      httpStatus: 0,
      finalUrl: input.finalUrl,
      positiveMarkers: [],
      negativeMarkers: [],
      reason: "Fetch failed",
      confirmed: false,
      suggestedConfidence: 0,
    };
  }

  const status = input.httpStatus;
  let host = "";
  let path = "/";
  try {
    const u = new URL(input.finalUrl);
    host = u.hostname;
    path = u.pathname;
  } catch {
    return {
      status: "error",
      httpStatus: status,
      finalUrl: input.finalUrl,
      positiveMarkers: [],
      negativeMarkers: [],
      reason: "Invalid final URL",
      confirmed: false,
      suggestedConfidence: 0,
    };
  }

  if (!/glossgenius\.com/i.test(host)) {
    return {
      status: "error",
      httpStatus: status,
      finalUrl: input.finalUrl,
      positiveMarkers: [],
      negativeMarkers: [],
      reason: "Final host is not glossgenius.com",
      confirmed: false,
      suggestedConfidence: 0,
    };
  }

  if (status === 403 || status === 429) {
    return {
      status: "blocked",
      httpStatus: status,
      finalUrl: input.finalUrl,
      positiveMarkers: [],
      negativeMarkers: [],
      reason: `HTTP ${status} blocked`,
      confirmed: false,
      suggestedConfidence: 0,
    };
  }

  if (status === 404 || status === 410) {
    return {
      status: "not_found",
      httpStatus: status,
      finalUrl: input.finalUrl,
      positiveMarkers: [],
      negativeMarkers: [],
      reason: `HTTP ${status}`,
      confirmed: false,
      suggestedConfidence: 0,
    };
  }

  const okStatus = status >= 200 && status < 400;
  if (!okStatus) {
    return {
      status: "error",
      httpStatus: status,
      finalUrl: input.finalUrl,
      positiveMarkers: [],
      negativeMarkers: [],
      reason: `HTTP ${status}`,
      confirmed: false,
      suggestedConfidence: 0,
    };
  }

  if (isApexGlossGeniusHost(host) || isMarketingPath(path)) {
    const redirectHome = isApexGlossGeniusHost(host) && slugFromRequested;
    return {
      status: redirectHome ? "redirect_home" : "generic_glossgenius_page",
      httpStatus: status,
      finalUrl: input.finalUrl,
      positiveMarkers: [],
      negativeMarkers: ["marketing_home"],
      reason: redirectHome
        ? "Redirected to GlossGenius home/marketing"
        : "Marketing or home page path",
      confirmed: false,
      suggestedConfidence: 0,
    };
  }

  const title = titleFromHtml(input.body);
  const { positive, negative } = scanMarkers(input.body, title);
  const titleMatch = titleMatchesHints(
    title,
    input.slugHint ?? slugFromRequested,
    input.displayNameHint,
    input.handleHint,
  );

  const negativeHomepage =
    negative.includes("marketing_home") ||
    negative.includes("salon_spa_software") ||
    negative.includes("free_trial") ||
    negative.includes("grow_business");

  const bookingSignals = hasStrongBookingSignals(positive);
  const hasGgBookingMarker = positive.includes("glossgenius_booking") && bookingSignals;

  if (negativeHomepage && !bookingSignals) {
    return {
      status: "generic_glossgenius_page",
      httpStatus: status,
      finalUrl: input.finalUrl,
      positiveMarkers: positive,
      negativeMarkers: negative,
      reason: "Homepage/marketing markers without booking signals",
      confirmed: false,
      suggestedConfidence: 0,
    };
  }

  if (bookingSignals || (hasGgBookingMarker && titleMatch) || (positive.length >= 3 && titleMatch)) {
    const conf = confidenceForConfirmed(input.discoverySource, positive, titleMatch);
    return {
      status: "confirmed_client_page",
      httpStatus: status,
      finalUrl: input.finalUrl.replace(/\/+$/, ""),
      positiveMarkers: positive,
      negativeMarkers: negative,
      reason: titleMatch
        ? "Client booking page — title and booking markers"
        : "Client booking page — booking markers",
      confirmed: true,
      suggestedConfidence: conf,
    };
  }

  if (positive.length >= 1 && !negativeHomepage && slugFromRequested) {
    return {
      status: "generic_glossgenius_page",
      httpStatus: status,
      finalUrl: input.finalUrl,
      positiveMarkers: positive,
      negativeMarkers: negative,
      reason: "Weak booking signals on GlossGenius host",
      confirmed: false,
      suggestedConfidence: 0,
    };
  }

  return {
    status: "generic_glossgenius_page",
    httpStatus: status,
    finalUrl: input.finalUrl,
    positiveMarkers: positive,
    negativeMarkers: negative.length ? negative : ["no_booking_markers"],
    reason: "No client booking indicators",
    confirmed: false,
    suggestedConfidence: 0,
  };
}

export async function validateGlossGeniusPage(
  input: GgPageValidationInput,
): Promise<GgPageValidationResult> {
  const fetched = await fetchGgPage(input.url);
  return classifyGgPageContent({
    ...fetched,
    requestedUrl: input.url,
    slugHint: input.slugHint,
    displayNameHint: input.displayNameHint,
    handleHint: input.handleHint,
    discoverySource: input.discoverySource,
  });
}

export function mapValidationSource(
  source: BookingProviderSource | GgValidationSource | string | undefined,
): GgValidationSource {
  if (source === "link_in_bio" || source === "link_trail") return "link_in_bio";
  if (source === "handle_derived") return "handle_derived";
  if (source === "display_name_derived") return "display_name_derived";
  return "direct_url";
}

export function isGgValidationConfirmed(
  status?: GgValidationStatus | string | null,
): boolean {
  return status === "confirmed_client_page";
}
