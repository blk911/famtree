// lib/intelligence/salon/provider-detector.ts
// Detect public booking/back-office providers from URLs and link-trail text.
// Upload/import and public link detection only — no private account scraping.

export type SalonBookingProvider =
  | "glossgenius"
  | "vagaro"
  | "square"
  | "booksy"
  | "fresha"
  | "styleseat"
  | "schedulicity"
  | "acuity"
  | "mangomint"
  | "calendly"
  | "timely"
  | "setmore"
  | "unknown";

export type BookingProviderConfidence = "high" | "medium" | "low";

export type SalonBookingProviderDetection = {
  provider: SalonBookingProvider;
  providerLabel: string;
  bookingUrl?: string;
  confidence: BookingProviderConfidence;
  evidence: string[];
};

const PROVIDER_LABELS: Record<SalonBookingProvider, string> = {
  glossgenius: "GlossGenius",
  vagaro: "Vagaro",
  square: "Square",
  booksy: "Booksy",
  fresha: "Fresha",
  styleseat: "StyleSeat",
  schedulicity: "Schedulicity",
  acuity: "Acuity",
  mangomint: "Mangomint",
  calendly: "Calendly",
  timely: "Timely",
  setmore: "Setmore",
  unknown: "Unknown",
};

type ProviderRule = {
  provider: SalonBookingProvider;
  patterns: string[];
  /** Direct booking URL (not link-in-bio aggregator). */
  direct?: boolean;
};

const PROVIDER_RULES: ProviderRule[] = [
  {
    provider: "glossgenius",
    patterns: [
      "glossgenius.com",
      "glossgenius.io",
      "glossgenius.app.link",
      "glossgenius.site",
      "book.glossgenius.com",
    ],
    direct: true,
  },
  { provider: "vagaro", patterns: ["vagaro.com", "vagaro.app.link", "vagaro.com/us"], direct: true },
  {
    provider: "square",
    patterns: [
      "square.site",
      "square.site/book",
      "squareup.com/appointments",
      "squareup.com/appointments/book",
      "booking.squareup.com",
    ],
    direct: true,
  },
  { provider: "booksy", patterns: ["booksy.com"], direct: true },
  { provider: "fresha", patterns: ["fresha.com", "fresha.net"], direct: true },
  { provider: "styleseat", patterns: ["styleseat.com"], direct: true },
  { provider: "schedulicity", patterns: ["schedulicity.com"], direct: true },
  { provider: "acuity", patterns: ["acuityscheduling.com", "acuityappointments.com"], direct: true },
  { provider: "mangomint", patterns: ["mangomint.com"], direct: true },
  { provider: "calendly", patterns: ["calendly.com"], direct: true },
  { provider: "timely", patterns: ["gettimely.com", "timely.com"], direct: true },
  { provider: "setmore", patterns: ["setmore.com"], direct: true },
];

const LINK_IN_BIO_HOSTS = [
  "linktr.ee",
  "linktree",
  "beacons.ai",
  "beacons.page",
  "stan.store",
  "msha.ke",
  "bio.link",
  "lnk.bio",
  "taplink",
];

function norm(value: string): string {
  return value.toLowerCase().trim();
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.startsWith("http") ? value : `https://${value}`);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.toLowerCase();
  } catch {
    return norm(url);
  }
}

export function isLinkInBioUrl(url: string): boolean {
  const host = hostOf(url);
  return LINK_IN_BIO_HOSTS.some((h) => host.includes(h));
}

function matchRule(haystack: string, rule: ProviderRule): boolean {
  return rule.patterns.some((p) => haystack.includes(norm(p)));
}

function confidenceToScore(c: BookingProviderConfidence): number {
  if (c === "high") return 85;
  if (c === "medium") return 65;
  return 45;
}

export function confidenceToNumber(c: BookingProviderConfidence): number {
  return confidenceToScore(c);
}

export function getBookingProviderLabel(provider: SalonBookingProvider): string {
  return PROVIDER_LABELS[provider] ?? "Unknown";
}

/**
 * Detect a single booking provider from one URL or text snippet.
 */
export function detectSalonBookingProvider(
  urlOrText: string,
  options?: { fromLinkInBio?: boolean },
): SalonBookingProviderDetection | null {
  const raw = (urlOrText ?? "").trim();
  if (!raw) return null;

  const haystack = norm(raw);
  const fromLib = options?.fromLinkInBio ?? isLinkInBioUrl(raw);

  for (const rule of PROVIDER_RULES) {
    if (!matchRule(haystack, rule)) continue;

    const bookingUrl = isHttpUrl(raw) ? (raw.startsWith("http") ? raw : `https://${raw}`) : undefined;
    const confidence: BookingProviderConfidence = fromLib
      ? "medium"
      : rule.direct
        ? "high"
        : "medium";

    return {
      provider: rule.provider,
      providerLabel: getBookingProviderLabel(rule.provider),
      bookingUrl,
      confidence,
      evidence: [
        fromLib
          ? `booking provider via link-in-bio trail: ${rule.patterns[0]}`
          : `direct booking URL: ${rule.patterns[0]}`,
      ],
    };
  }

  // Text-only mention (caption / evidence) without URL
  if (!isHttpUrl(raw)) {
    for (const rule of PROVIDER_RULES) {
      if (rule.patterns.some((p) => haystack.includes(norm(p.replace(/\./g, ""))) || haystack.includes(norm(p)))) {
        return {
          provider: rule.provider,
          providerLabel: getBookingProviderLabel(rule.provider),
          confidence: "low",
          evidence: [`text mention: ${rule.provider}`],
        };
      }
    }
  }

  return null;
}

function scoreDetection(d: SalonBookingProviderDetection): number {
  return confidenceToScore(d.confidence);
}

/**
 * Pick the best provider detection from multiple URLs and optional free text.
 */
export function detectBestSalonBookingProvider(input: {
  urls?: Array<string | null | undefined>;
  text?: string;
  linkPageLinks?: Array<string | null | undefined>;
}): SalonBookingProviderDetection | null {
  const candidates: SalonBookingProviderDetection[] = [];

  for (const url of input.urls ?? []) {
    if (!url) continue;
    const hit = detectSalonBookingProvider(url, { fromLinkInBio: isLinkInBioUrl(url) });
    if (hit) candidates.push(hit);
  }

  for (const link of input.linkPageLinks ?? []) {
    if (!link) continue;
    const hit = detectSalonBookingProvider(link, { fromLinkInBio: true });
    if (hit) candidates.push(hit);
  }

  if (input.text) {
    const textHit = detectSalonBookingProvider(input.text);
    if (textHit) candidates.push(textHit);
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => scoreDetection(b) - scoreDetection(a));
  const best = candidates[0];
  const mergedEvidence = Array.from(
    new Set(candidates.flatMap((c) => c.evidence)),
  ).slice(0, 8);

  return {
    ...best,
    bookingUrl: best.bookingUrl ?? candidates.find((c) => c.bookingUrl)?.bookingUrl,
    evidence: mergedEvidence,
  };
}

export const IMPORT_CANDIDATE_PROVIDERS: SalonBookingProvider[] = ["glossgenius", "vagaro"];

export function isBackOfficeImportCandidate(provider?: SalonBookingProvider | string): boolean {
  return provider === "glossgenius" || provider === "vagaro";
}
