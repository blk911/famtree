// lib/intelligence/salon/glossgenius-handle-resolver.ts
// Probe probable {slug}.glossgenius.com pages from public IG handles / display names.

import { getBookingProviderLabel } from "./provider-detector";
import type { GgCandidateDescriptor, GgProbeLogEntry } from "./gg-resolver-types";
import {
  validateGlossGeniusPage,
  type GgValidationStatus,
} from "./glossgenius-page-validator";

const MAX_CONCURRENT = 5;
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
  ggCandidateUrls: string[];
  ggValidatedUrl?: string;
  ggValidationStatus: GgValidationStatus;
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

function displayNamePrimarySegment(displayName: string): string {
  const pipe = displayName.split("|")[0]?.trim();
  return pipe && pipe.length > 0 ? pipe : displayName.trim();
}

/** Display name → slug, dropping location tokens when safe. */
export function slugFromDisplayName(displayName: string): string {
  const primary = displayNamePrimarySegment(displayName);
  const words = primary
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

/** Conservative display-name slug variants (max a few). */
export function generateDisplayNameGgCandidates(displayName: string): string[] {
  const primary = displayNamePrimarySegment(displayName);
  const words = primary
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase())
    .filter((w) => !LOCATION_WORDS.has(w) && w.length > 1 && !/^(co|colorist|stylist|salon|studio)$/i.test(w));

  const out = new Set<string>();
  const full = slugFromDisplayName(displayName);
  if (full.length >= 3) out.add(full);

  if (words.length >= 2) {
    const first = words[0];
    const last = words[words.length - 1];
    if (first && last && first !== last) {
      out.add(normalizeGlossGeniusSlug(`${first}${last}`));
      if (/hair|lash|nail|beauty/i.test(displayName)) {
        out.add(normalizeGlossGeniusSlug(`${first}hair`));
        out.add(normalizeGlossGeniusSlug(`${last}hair`));
      }
    }
  }

  return Array.from(out).filter((s) => s.length >= 3).slice(0, 4);
}

const BY_INFIX_PATTERN =
  /^(.*?)(hair|nails|nail|lash|lashes|beauty|brow|esthetic)(?:by)([a-z0-9]+)$/i;

/** Extract slugs from handles like nat20hairbycas → nat20hair, nat20haircas */
function extractByInfixSlugs(normalizedHandle: string): string[] {
  const m = normalizedHandle.match(BY_INFIX_PATTERN);
  if (!m) return [];
  const [, prefix, middle, suffix] = m;
  const out: string[] = [];
  if (prefix && middle) out.push(`${prefix}${middle}`);
  if (prefix && middle && suffix) out.push(`${prefix}${middle}${suffix}`);
  if (prefix && prefix.length >= 3) out.push(prefix);
  return out.map((s) => normalizeGlossGeniusSlug(s)).filter((s) => s.length >= 3);
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

  for (const slug of extractByInfixSlugs(base)) {
    out.add(slug);
  }

  // Trailing digit prefix strip: nat20hairbycas → try without leading digits block
  const noLeadDigits = base.replace(/^[0-9]+/, "");
  if (noLeadDigits.length >= 3) add(noLeadDigits);

  return Array.from(out);
}

const MAX_GG_CANDIDATES_TOTAL = 8;

export function collectGlossGeniusCandidates(
  input: GlossGeniusHandleResolverInput,
): GgCandidateDescriptor[] {
  const seen = new Set<string>();
  const out: Candidate[] = [];
  const push = (slug: string, source: Candidate["source"]) => {
    if (!slug || slug.length < 3 || out.length >= MAX_GG_CANDIDATES_TOTAL) return;
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
      if (out.length >= MAX_GG_CANDIDATES_TOTAL) return out;
    }
  }

  const display = (input.displayName ?? "").trim();
  if (display && out.length < MAX_GG_CANDIDATES_TOTAL) {
    for (const slug of generateDisplayNameGgCandidates(display)) {
      push(slug, "display_name_derived");
      if (out.length >= MAX_GG_CANDIDATES_TOTAL) break;
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

async function probeCandidateFull(
  candidate: Candidate,
  hints: { displayName?: string | null; handle?: string | null },
): Promise<{
  hit: GlossGeniusHandleResolverResult | null;
  log: GgProbeLogEntry;
  validationStatus: GgValidationStatus;
}> {
  const validation = await validateGlossGeniusPage({
    url: candidate.url,
    slugHint: candidate.slug,
    displayNameHint: hints.displayName,
    handleHint: hints.handle,
    discoverySource: candidate.source,
  });

  const log: GgProbeLogEntry = {
    url: candidate.url,
    httpStatus: validation.httpStatus,
    finalUrl: validation.finalUrl,
    markersFound: validation.positiveMarkers,
    validationStatus: validation.status,
    positiveMarkers: validation.positiveMarkers,
    negativeMarkers: validation.negativeMarkers,
    reason: validation.reason,
    error:
      validation.status === "timeout"
        ? "timeout"
        : validation.status === "error"
          ? "fetch_error"
          : undefined,
  };

  if (!validation.confirmed || !validation.finalUrl) {
    return { hit: null, log, validationStatus: validation.status };
  }

  const bookingUrl = validation.finalUrl.replace(/\/+$/, "");
  return {
    hit: {
      found: true,
      provider: "glossgenius",
      providerLabel: "GlossGenius",
      bookingUrl,
      confidence: validation.suggestedConfidence,
      source: candidate.source,
      evidence: [
        `providerSource: ${candidate.source}`,
        `ggValidation: ${validation.status}`,
        `glossgenius slug: ${candidate.slug}.glossgenius.com`,
        `positive: ${validation.positiveMarkers.join(", ")}`,
        validation.reason,
      ],
      checkedUrls: [candidate.url],
      ggCandidateUrls: [candidate.url],
      ggValidatedUrl: bookingUrl,
      ggValidationStatus: "confirmed_client_page",
      reason: "confirmed_client_page",
    },
    log,
    validationStatus: validation.status,
  };
}

async function runPoolCandidates(
  candidates: Candidate[],
  stopOnFirstHit: boolean,
  hints: { displayName?: string | null; handle?: string | null },
): Promise<{
  hit: GlossGeniusHandleResolverResult | null;
  probeLog: GgProbeLogEntry[];
  lastValidationStatus: GgValidationStatus;
}> {
  const probeLog: GgProbeLogEntry[] = [];
  let hit: GlossGeniusHandleResolverResult | null = null;
  let index = 0;
  let lastValidationStatus: GgValidationStatus = "candidate_only";

  async function worker(): Promise<void> {
    while (index < candidates.length) {
      if (stopOnFirstHit && hit) return;
      const i = index++;
      const { hit: candidateHit, log, validationStatus } = await probeCandidateFull(
        candidates[i],
        hints,
      );
      probeLog.push(log);
      lastValidationStatus = validationStatus;
      if (candidateHit && !hit) {
        hit = {
          ...candidateHit,
          checkedUrls: candidates.map((c) => c.url),
          ggCandidateUrls: candidates.map((c) => c.url),
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

  return { hit, probeLog, lastValidationStatus };
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

  const hints = {
    displayName: input.displayName,
    handle: input.instagramHandle,
  };
  const { hit, probeLog, lastValidationStatus } = await runPoolCandidates(
    candidates,
    false,
    hints,
  );
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
      ggCandidateUrls: candidates.map((c) => c.url),
    };
  }

  const hadTimeout = probeLog.some((p) => p.error === "timeout");
  return {
    ...emptyResult(
      candidates.map((c) => c.url),
      probeLog,
      hadTimeout ? "timeout" : lastValidationStatus,
    ),
    candidates,
    statusCodes,
    markersFound,
    ggValidationStatus: lastValidationStatus,
  };
}

function emptyResult(
  checkedUrls: string[],
  probeLog: GgProbeLogEntry[],
  reasonOrStatus: string,
): GlossGeniusHandleResolverResult {
  const status = (
    [
      "not_attempted",
      "candidate_only",
      "confirmed_client_page",
      "generic_glossgenius_page",
      "not_found",
      "redirect_home",
      "blocked",
      "timeout",
      "error",
    ] as const
  ).includes(reasonOrStatus as GgValidationStatus)
    ? (reasonOrStatus as GgValidationStatus)
    : reasonOrStatus === "timeout"
      ? "timeout"
      : reasonOrStatus === "error"
        ? "error"
        : reasonOrStatus === "not_found"
          ? "not_found"
          : "candidate_only";

  return {
    found: false,
    provider: null,
    providerLabel: null,
    confidence: 0,
    source: "none",
    evidence: [],
    checkedUrls,
    ggCandidateUrls: checkedUrls,
    ggValidationStatus: status,
    probeLog,
    reason: reasonOrStatus,
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

  const hints = {
    displayName: input.displayName,
    handle: input.instagramHandle,
  };
  const { hit, probeLog, lastValidationStatus } = await runPoolCandidates(
    candidates,
    true,
    hints,
  );
  const checkedUrls = candidates.map((c) => c.url);

  if (hit) {
    return {
      ...hit,
      candidates,
      probeLog,
      statusCodes: probeLog.map((p) => p.httpStatus),
      markersFound: Array.from(new Set(probeLog.flatMap((p) => p.markersFound))),
      checkedUrls,
      ggCandidateUrls: checkedUrls,
    };
  }

  const hadTimeout = probeLog.some((p) => p.error === "timeout");
  const hadError = probeLog.some((p) => p.error === "fetch_error");
  const fallbackStatus: GgValidationStatus = hadTimeout
    ? "timeout"
    : hadError
      ? "error"
      : lastValidationStatus !== "candidate_only"
        ? lastValidationStatus
        : "not_found";

  return {
    ...emptyResult(checkedUrls, probeLog, fallbackStatus),
    candidates,
    statusCodes: probeLog.map((p) => p.httpStatus),
    markersFound: Array.from(new Set(probeLog.flatMap((p) => p.markersFound))),
    ggValidationStatus: fallbackStatus,
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
  if (
    !result.found ||
    !result.bookingUrl ||
    result.source === "none" ||
    result.ggValidationStatus !== "confirmed_client_page"
  ) {
    return null;
  }
  return {
    provider: "glossgenius",
    providerLabel: getBookingProviderLabel("glossgenius"),
    providerConfidence: result.confidence,
    providerSource: result.source,
    bookingUrl: result.bookingUrl,
    evidence: result.evidence,
  };
}
