// lib/studios/creator-lab/ig-stubs/validator.ts
// Fetches candidate URLs, extracts signals, and produces heuristic confidence scores.

import type { IgSeed, CandidateFetch, ResolvedProfile, RejectedCandidate } from "./types";
import { APPOINTMENT_PLATFORMS } from "./url-patterns";
import type { CandidateUrl } from "./url-patterns";

const FETCH_TIMEOUT_MS = 8_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Service-category keywords used for signal extraction
const SERVICE_TERMS = [
  "lash", "lashes", "nail", "nails", "hair", "brow", "brows",
  "facial", "wax", "waxing", "massage", "makeup", "tattoo",
  "piercing", "aesthetic", "aesthetics", "injector", "botox", "filler",
  "microblading", "pmu", "permanent makeup", "salon", "spa", "studio",
  "booking", "appointment", "appointments", "services", "menu",
  "balayage", "highlights", "color", "cut", "extensions", "keratin",
];

const LOCATION_PATTERNS = [
  "new york", "los angeles", "miami", "chicago", "houston", "phoenix",
  "dallas", "atlanta", "denver", "austin", "seattle", "boston", "san francisco",
  "las vegas", "nashville", "orlando", "portland", "minneapolis",
  "nyc", "la", "sf", "bay area", "socal", "norcal",
];

// Pages that indicate a "not found" or login wall — reduce confidence
const DEAD_PAGE_PATTERNS = [
  "sign in to continue", "log in to see", "this account is private",
  "page not found", "404", "doesn't exist", "no longer available",
  "sorry, this page", "create an account",
];

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchCandidate(candidate: CandidateUrl): Promise<CandidateFetch> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const base: CandidateFetch = {
    url: candidate.url,
    platform: candidate.platform,
    ok: false,
    httpStatus: 0,
    finalUrl: candidate.url,
    title: null,
    description: null,
    bodyText: "",
    instagramLinks: [],
    allLinks: [],
    imageUrls: [],
  };

  try {
    const res = await fetch(candidate.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
      },
      redirect: "follow",
    });
    clearTimeout(timer);

    const finalUrl = res.url || candidate.url;
    const httpStatus = res.status;

    if (!res.ok) {
      return { ...base, httpStatus, finalUrl };
    }

    const html = await res.text();

    // Title
    const titleMatch = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
    const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : null;

    // Meta description (try og:description first, then regular)
    const descMatch =
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{1,300})["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']{1,300})["'][^>]+property=["']og:description["']/i) ||
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,300})["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']{1,300})["'][^>]+name=["']description["']/i);
    const description = descMatch ? decodeHtmlEntities(descMatch[1].trim()) : null;

    // All links
    const allLinks = Array.from(html.matchAll(/href=["']([^"']{4,}?)["']/gi))
      .map((m) => m[1])
      .filter((l) => l.startsWith("http"));

    // Instagram back-links
    const instagramLinks = allLinks.filter((l) => l.includes("instagram.com"));

    // Image URLs (og:image + img src)
    const ogImgMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    const imgSrcs = Array.from(html.matchAll(/src=["']([^"']+\.(jpg|jpeg|png|webp)[^"']*)["']/gi))
      .map((m) => m[1])
      .filter((u) => u.startsWith("http"))
      .slice(0, 5);
    const imageUrls = ogImgMatch ? [ogImgMatch[1], ...imgSrcs] : imgSrcs;

    // Visible body text
    const bodyText = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4_000);

    return {
      ...base,
      ok: true,
      httpStatus,
      finalUrl,
      title,
      description,
      bodyText,
      instagramLinks,
      allLinks,
      imageUrls,
    };
  } catch {
    clearTimeout(timer);
    return base;
  }
}

// ─── Heuristic scorer ─────────────────────────────────────────────────────────

export function scoreCandidate(
  seed: IgSeed,
  fetched: CandidateFetch,
  /** Pass true when this URL was machine-generated (not found in source evidence).
   *  Generated URLs do NOT receive the +35 "handle in URL" bonus — we put the handle there,
   *  so it is a circular signal. They may still receive the +15 "handle in page text" bonus
   *  if the handle actually appears in the fetched page content. */
  isGenerated = false,
): ResolvedProfile | null {
  if (!fetched.ok) return null;

  const handleClean = seed.handle.toLowerCase();
  const nameClean = seed.displayName.toLowerCase();
  const fullText = [fetched.title, fetched.description, fetched.bodyText]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // Dead-page check — return null if this looks like a login wall or 404
  const isDead = DEAD_PAGE_PATTERNS.some((p) => fullText.includes(p));
  if (isDead) return null;

  // Also reject if final URL changed to a completely different domain (redirect to homepage)
  try {
    const finalHost = new URL(fetched.finalUrl).hostname;
    const origHost = new URL(fetched.url).hostname;
    if (finalHost !== origHost && !origHost.includes(finalHost) && !finalHost.includes(origHost)) {
      return null; // Redirected away — profile doesn't exist
    }
  } catch {
    // URL parse failed, proceed
  }

  let score = 0;
  const reasons: string[] = [];
  const evidence: string[] = [];

  // ── Handle match ──────────────────────────────────────────────────────────
  // IMPORTANT: For generated URLs we do NOT award the +35 "exact handle in URL" bonus.
  // The handle is in the URL because we constructed it that way — it is a circular signal
  // and would artificially inflate confidence for unverified profiles.
  if (!isGenerated && fetched.url.toLowerCase().includes(handleClean)) {
    score += 35;
    reasons.push("exact handle in URL");
  } else if (fullText.includes(handleClean)) {
    // Handle present in the actual page content — real signal regardless of generation
    score += 15;
    reasons.push("handle in page text");
  }

  // ── Display name match ────────────────────────────────────────────────────
  if (fullText.includes(nameClean)) {
    score += 25;
    reasons.push("display name match");
    const idx = fullText.indexOf(nameClean);
    evidence.push(
      `"...${fullText.slice(Math.max(0, idx - 30), idx + nameClean.length + 30)}..."`
    );
  }

  // ── Instagram back-link to same handle ────────────────────────────────────
  const igBacklink = fetched.instagramLinks.find(
    (l) =>
      l.toLowerCase().includes(`instagram.com/${handleClean}`) ||
      l.toLowerCase().includes(`instagram.com/@${handleClean}`)
  );
  if (igBacklink) {
    score += 30;
    reasons.push("IG backlink confirmed");
    evidence.push(`IG link: ${igBacklink}`);
  } else if (fetched.instagramLinks.length > 0) {
    // IG link exists but handle doesn't match — slight positive but no bonus
    evidence.push(`IG link present: ${fetched.instagramLinks[0]}`);
  }

  // ── Service / category signals ────────────────────────────────────────────
  const matchedServices = SERVICE_TERMS.filter((t) => fullText.includes(t));
  const uniqueServices = Array.from(new Set(matchedServices));
  if (uniqueServices.length > 0) {
    score += Math.min(15, uniqueServices.length * 3);
    reasons.push(`services: ${uniqueServices.slice(0, 4).join(", ")}`);
  }

  // ── Location signals ──────────────────────────────────────────────────────
  const matchedLoc = LOCATION_PATTERNS.find((l) => fullText.includes(l));
  if (matchedLoc) {
    score += 15;
    reasons.push(`location: ${matchedLoc}`);
  }

  // ── Conflicting identity (different prominent name) ────────────────────────
  // Heuristic: title starts with a name that shares no words with displayName
  if (fetched.title) {
    const titleName = fetched.title.split(/[|–\-]/)[0].trim().toLowerCase();
    const nameWords = nameClean.split(/\s+/);
    const titleWords = titleName.split(/\s+/);
    const hasOverlap = nameWords.some((w) => w.length > 3 && titleWords.includes(w));
    if (!hasOverlap && titleName.length > 5 && score < 40) {
      score -= 40;
      reasons.push("⚠️ title name conflicts with identity");
    }
  }

  if (score < 5) return null;

  // ── Extract prices ────────────────────────────────────────────────────────
  const priceMatches = Array.from(
    new Set(Array.from(fullText.matchAll(/\$\s*[\d,]+(?:\.\d{2})?/g)).map((m) => m[0].replace(/\s/, "")))
  ).slice(0, 10);

  // ── Social links ──────────────────────────────────────────────────────────
  const socialLinks = fetched.allLinks
    .filter((l) =>
      l.includes("instagram.com") ||
      l.includes("tiktok.com") ||
      l.includes("facebook.com") ||
      l.includes("pinterest.com")
    )
    .slice(0, 5);

  // ── Detected name from title ──────────────────────────────────────────────
  const detectedName = fetched.title
    ? fetched.title.split(/[|–\-·]/)[0].trim()
    : null;

  if (fetched.title) evidence.unshift(`Title: "${fetched.title}"`);
  if (fetched.description) {
    evidence.push(`Description: "${fetched.description.slice(0, 120)}"`);
  }

  return {
    platform: fetched.platform,
    url: fetched.url,
    matchReason: reasons.join(" · "),
    extractedTitle: fetched.title,
    extractedDescription: fetched.description,
    detectedName,
    detectedLocation: matchedLoc ?? null,
    detectedServices: uniqueServices
      .slice(0, 8)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
    detectedPrices: priceMatches,
    detectedSocialLinks: socialLinks,
    confidenceScore: Math.max(0, Math.min(100, score)),
    evidenceSnippets: evidence.slice(0, 5),
  };
}

// ─── Appointment-platform verification for generated candidates ───────────────

/**
 * For a machine-generated appointment-platform URL (e.g. styleseat.com/m/{handle}),
 * verify that the fetched page actually belongs to this creator before accepting it
 * as confirmed evidence.
 *
 * Verification passes when the fetched page contains:
 *   - An Instagram backlink pointing to the same handle  ← strongest signal
 *   - OR the creator's display name in prominent text    ← reasonable signal
 *
 * A URL that passes ONLY the handle-in-URL check is NOT verified — that signal
 * is circular because we constructed the URL ourselves.
 */
export function verifyGeneratedAppointmentCandidate(
  seed: IgSeed,
  fetched: CandidateFetch,
  scored: ResolvedProfile | null,
): { confirmed: boolean; reason: string } {
  if (!fetched.ok) return { confirmed: false, reason: "not_found" };
  if (scored === null) return { confirmed: false, reason: "dead_page_or_low_score" };

  // IG backlink pointing to the exact same handle
  const handleLow = seed.handle.toLowerCase();
  const igBacklink = fetched.instagramLinks.find(
    (l) =>
      l.toLowerCase().includes(`instagram.com/${handleLow}`) ||
      l.toLowerCase().includes(`instagram.com/@${handleLow}`)
  );
  if (igBacklink) return { confirmed: true, reason: "ig_backlink_confirmed" };

  // Display name found in page text (must be > 3 chars to avoid false positives)
  const nameClean = seed.displayName.toLowerCase().trim();
  if (nameClean.length > 3) {
    const searchText = [fetched.title, fetched.description, fetched.bodyText]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (searchText.includes(nameClean)) {
      return { confirmed: true, reason: "display_name_confirmed" };
    }
  }

  return { confirmed: false, reason: "appointment_platform_unverified" };
}

// ─── Fast resolve (tracked): fetch + score + verify, returning diagnostic data ─

export interface ResolveTrackedResult {
  /** Candidates that passed scoring AND (for generated appointment platforms) verification */
  confirmedProfiles: ResolvedProfile[];
  /** Candidates that were tested but rejected, with reason */
  rejectedCandidates: RejectedCandidate[];
  /** All candidate URLs that were submitted for testing */
  candidateUrlsTested: string[];
}

export async function fastResolveTracked(
  seed: IgSeed,
  candidates: CandidateUrl[],
): Promise<ResolveTrackedResult> {
  const fetchResults = await Promise.allSettled(
    candidates.map((c) => fetchCandidate(c))
  );

  const confirmedProfiles: ResolvedProfile[] = [];
  const rejectedCandidates: RejectedCandidate[] = [];
  const candidateUrlsTested = candidates.map((c) => c.url);

  for (let i = 0; i < fetchResults.length; i++) {
    const result = fetchResults[i];
    const candidate = candidates[i];
    const isGenerated = candidate.isGenerated ?? false;

    if (result.status !== "fulfilled") {
      rejectedCandidates.push({ url: candidate.url, platform: candidate.platform, reason: "fetch_error" });
      continue;
    }

    const fetched = result.value;
    const scored = scoreCandidate(seed, fetched, isGenerated);

    // Generated appointment-platform URLs require additional identity verification.
    // Without it we would save URLs we constructed ourselves as confirmed matches.
    if (isGenerated && APPOINTMENT_PLATFORMS.has(candidate.platform)) {
      const verification = verifyGeneratedAppointmentCandidate(seed, fetched, scored);
      if (!verification.confirmed) {
        rejectedCandidates.push({ url: candidate.url, platform: candidate.platform, reason: verification.reason });
        continue;
      }
    }

    if (scored) {
      confirmedProfiles.push(scored);
    } else {
      rejectedCandidates.push({ url: candidate.url, platform: candidate.platform, reason: "low_score_or_dead" });
    }
  }

  return {
    confirmedProfiles: confirmedProfiles.sort((a, b) => b.confidenceScore - a.confidenceScore),
    rejectedCandidates,
    candidateUrlsTested,
  };
}

// ─── Fast resolve: backward-compatible wrapper around fastResolveTracked ──────

export async function fastResolve(
  seed: IgSeed,
  candidates: CandidateUrl[],
): Promise<ResolvedProfile[]> {
  const tracked = await fastResolveTracked(seed, candidates);
  return tracked.confirmedProfiles;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
