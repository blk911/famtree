// app/api/admin/studios/creator-lab/ig-stubs/resolve/route.ts
// POST /api/admin/studios/creator-lab/ig-stubs/resolve
//
// Resolution order (priority highest → lowest):
//   1. IG profile direct URL (externalUrl from Apify profile scraper) → booking provider → RESOLVED
//   2. IG profile direct URL → plain website → PARTIAL / website_found
//   3. Link-in-bio trail from generated Linktree/Beacons candidates → booking URL → PARTIAL/RESOLVED
//   4. Generated booking-platform URLs (glossgenius/vagaro/etc) → verified match → RESOLVED
//   5. All of the above fail → UNRESOLVED
//
// GG fallback and public presence are NOT run here — they belong in the harvest path.

export const dynamic = "force-dynamic";
export const maxDuration = 90;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sanitizeHandle, generateCandidateUrls } from "@/lib/studios/creator-lab/ig-stubs/url-patterns";
import { fastResolveTracked } from "@/lib/studios/creator-lab/ig-stubs/validator";
import { fetchIgProfiles } from "@/lib/studios/creator-lab/ig-stubs/ig-profile-fetch";
import {
  detectBestSalonBookingProvider,
  isLinkInBioUrl,
} from "@/lib/intelligence/salon/provider-detector";
import { upsertProspect } from "@/lib/studios/prospects/store";
import { resultToProspect, generateBatchId } from "@/lib/studios/prospects/from-resolver";
import type {
  IgSeed,
  StubResolutionResult,
  ResolvedProfile,
  ResolverTrace,
  ResolveResponse,
  ResolveErrorResponse,
} from "@/lib/studios/creator-lab/ig-stubs/types";

// ─── Validation ───────────────────────────────────────────────────────────────

const SeedSchema = z.object({
  handle: z.string().min(1).max(60),
  displayName: z.string().max(120).default(""),
});

const RequestSchema = z.object({
  seeds: z.array(SeedSchema).min(1).max(10),
  mode: z.enum(["fast", "deep"]),
});

function err(error: string, detail?: string, status = 400) {
  return NextResponse.json({ ok: false, error, detail } as ResolveErrorResponse, { status });
}

// ─── Direct-URL → ResolvedProfile helper ─────────────────────────────────────

function makeDirectProfile(
  url: string,
  platform: string,
  confidence: number,
  reason: string,
): ResolvedProfile {
  return {
    platform,
    url,
    matchReason: reason,
    extractedTitle: null,
    extractedDescription: null,
    detectedName: null,
    detectedLocation: null,
    detectedServices: [],
    detectedPrices: [],
    detectedSocialLinks: [],
    confidenceScore: confidence,
    evidenceSnippets: [reason],
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON body");
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return err("Validation error", parsed.error.errors[0]?.message);
  }

  const { seeds, mode } = parsed.data;

  if (mode === "deep" && !process.env.OPENAI_API_KEY) {
    return err(
      "Deep Research Mode requires OPENAI_API_KEY",
      "Add OPENAI_API_KEY to Vercel → Settings → Environment Variables.",
      503
    );
  }

  const cleanSeeds: IgSeed[] = seeds.map((s) => ({
    handle: sanitizeHandle(s.handle),
    displayName: s.displayName.trim() || sanitizeHandle(s.handle),
  }));

  const activeSeed = mode === "deep" ? cleanSeeds.slice(0, 5) : cleanSeeds;
  const batchId = generateBatchId();

  // ── Step 1: Batch-fetch IG profiles (direct URL extraction) ──────────────────
  const profileFetchResult = await fetchIgProfiles(activeSeed.map((s) => s.handle));

  // ── Step 2: Resolve each seed in parallel ─────────────────────────────────
  const settled = await Promise.allSettled(
    activeSeed.map(async (seed): Promise<StubResolutionResult> => {
      const igProfile = profileFetchResult.profiles.get(seed.handle.toLowerCase()) ?? null;

      // Build trace skeleton
      const trace: ResolverTrace = {
        handle: seed.handle,
        profileFetch: {
          attempted: profileFetchResult.apifyOk,
          found: igProfile?.found ?? false,
          externalUrl: igProfile?.externalUrl ?? null,
          biography: igProfile?.biography ?? null,
          bioUrls: igProfile?.extraExternalUrls ?? [],
          error: profileFetchResult.error ?? igProfile?.error ?? null,
        },
        extracted: {
          allDirectUrls: [],
          providerFromDirectUrl: null,
          providerFromDirectUrlSource: null,
          websiteUrl: null,
        },
        generatedCandidates: {
          count: 0,
          linkTrailBookingUrls: [],
        },
        resolverDecision: {
          status: "unresolved",
          bestUrl: null,
          platform: null,
          confidence: 0,
          reason: "No match found",
        },
      };

      // ── Direct URL path ─────────────────────────────────────────────────────
      const directUrls: string[] = [];
      if (igProfile?.externalUrl) directUrls.push(igProfile.externalUrl);
      directUrls.push(...(igProfile?.extraExternalUrls ?? []));

      trace.extracted.allDirectUrls = directUrls;

      if (directUrls.length > 0) {
        // Run provider detection on the direct URLs
        const detection = detectBestSalonBookingProvider({ urls: directUrls });

        if (detection && detection.provider !== "unknown" && detection.bookingUrl) {
          // Booking provider found directly — RESOLVED
          const confidence = detection.confidence === "high" ? 95 : detection.confidence === "medium" ? 75 : 55;
          const profile = makeDirectProfile(
            detection.bookingUrl,
            detection.provider,
            confidence,
            `Direct IG profile URL → ${detection.providerLabel} (${detection.confidence} confidence)`,
          );

          trace.extracted.providerFromDirectUrl = detection.provider;
          trace.extracted.providerFromDirectUrlSource = "ig_direct_url";
          trace.resolverDecision = {
            status: "resolved",
            bestUrl: detection.bookingUrl,
            platform: detection.provider,
            confidence,
            reason: `Booking provider ${detection.providerLabel} found at externalUrl on IG profile.`,
          };

          return {
            seed,
            resolvedProfiles: [profile],
            bestMatch: profile,
            status: "resolved",
            candidateUrlsTested: directUrls,
            rejectedCandidates: [],
            linkTrailUrls: [],
            trace,
          };
        }

        // No booking provider — check if there's a plain website (non-aggregator)
        const websiteUrl = directUrls.find(
          (u) => u.startsWith("http") &&
            !u.includes("instagram.com") &&
            !u.includes("facebook.com") &&
            !isLinkInBioUrl(u),  // link aggregators (linktree/beacons) fall through to trail expansion
        ) ?? null;

        if (websiteUrl) {
          trace.extracted.websiteUrl = websiteUrl;
          const profile = makeDirectProfile(
            websiteUrl,
            "website",
            65,
            "Public website found from Instagram profile externalUrl.",
          );

          trace.resolverDecision = {
            status: "partial",
            bestUrl: websiteUrl,
            platform: "website",
            confidence: 65,
            reason: "Public website found from IG profile. No booking platform detected.",
          };

          return {
            seed,
            resolvedProfiles: [profile],
            bestMatch: profile,
            status: "partial",
            candidateUrlsTested: directUrls,
            rejectedCandidates: [],
            linkTrailUrls: [],
            trace,
          };
        }
        // If we reach here, externalUrl is a link aggregator — fall through to trail expansion
      }

      // ── Generated candidate path (link-in-bio + platform URL probing) ───────
      const candidates = generateCandidateUrls(seed.handle);
      trace.generatedCandidates.count = candidates.length;

      let validProfiles: ResolvedProfile[] = [];
      let candidateUrlsTested: string[] = candidates.map((c) => c.url);
      let rejectedCandidates: StubResolutionResult["rejectedCandidates"] = [];
      let linkTrailUrls: string[] = [];

      if (mode === "fast") {
        const tracked = await fastResolveTracked(seed, candidates);
        validProfiles = tracked.confirmedProfiles.filter((p) => p.confidenceScore >= 5);
        candidateUrlsTested = tracked.candidateUrlsTested;
        rejectedCandidates = tracked.rejectedCandidates;
        linkTrailUrls = tracked.linkTrailUrls;
      } else {
        const { deepResolve } = await import("@/lib/studios/creator-lab/ig-stubs/deep-research");
        const profiles = await deepResolve(seed, candidates);
        validProfiles = profiles.filter((p) => p.confidenceScore >= 5);
        candidateUrlsTested = candidates.map((c) => c.url);
      }

      trace.generatedCandidates.linkTrailBookingUrls = linkTrailUrls;

      // ── Link-trail booking URL upgrade ──────────────────────────────────────
      // If generated-candidate probing found booking URLs in link-in-bio pages
      // but no confirmed platform profiles, upgrade to partial using the trail URL.
      if (validProfiles.length === 0 && linkTrailUrls.length > 0) {
        const trailDetection = detectBestSalonBookingProvider({ urls: linkTrailUrls });
        if (trailDetection && trailDetection.provider !== "unknown" && trailDetection.bookingUrl) {
          const confidence = trailDetection.confidence === "high" ? 80 : 65;
          const trailProfile = makeDirectProfile(
            trailDetection.bookingUrl,
            trailDetection.provider,
            confidence,
            `Booking URL found in link-in-bio trail → ${trailDetection.providerLabel}`,
          );

          trace.resolverDecision = {
            status: "partial",
            bestUrl: trailDetection.bookingUrl,
            platform: trailDetection.provider,
            confidence,
            reason: `${trailDetection.providerLabel} booking URL extracted from link-in-bio page.`,
          };

          return {
            seed,
            resolvedProfiles: [trailProfile],
            bestMatch: trailProfile,
            status: "partial",
            candidateUrlsTested,
            rejectedCandidates,
            linkTrailUrls,
            trace,
          };
        }
      }

      const bestMatch = validProfiles[0] ?? null;
      const status: StubResolutionResult["status"] =
        bestMatch && bestMatch.confidenceScore >= 50
          ? "resolved"
          : bestMatch && bestMatch.confidenceScore >= 20
          ? "partial"
          : "unresolved";

      trace.resolverDecision = {
        status,
        bestUrl: bestMatch?.url ?? null,
        platform: bestMatch?.platform ?? null,
        confidence: bestMatch?.confidenceScore ?? 0,
        reason: bestMatch
          ? bestMatch.matchReason
          : "No booking profile found via direct URL, link-in-bio trail, or generated candidate probing.",
      };

      return {
        seed,
        resolvedProfiles: validProfiles,
        bestMatch,
        status,
        candidateUrlsTested,
        rejectedCandidates,
        linkTrailUrls,
        trace,
      };
    })
  );

  const results: StubResolutionResult[] = settled.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          seed: activeSeed[i],
          resolvedProfiles: [],
          bestMatch: null,
          status: "unresolved" as const,
          trace: {
            handle: activeSeed[i].handle,
            profileFetch: { attempted: false, found: false, externalUrl: null, biography: null, bioUrls: [], error: "Promise rejected" },
            extracted: { allDirectUrls: [], providerFromDirectUrl: null, providerFromDirectUrlSource: null, websiteUrl: null },
            generatedCandidates: { count: 0, linkTrailBookingUrls: [] },
            resolverDecision: { status: "unresolved", bestUrl: null, platform: null, confidence: 0, reason: "Resolution promise rejected" },
          },
        }
  );

  // ── Persist prospects (fire-and-forget) ────────────────────────────────────
  void (async () => {
    try {
      await Promise.allSettled(
        results.map(async (result) => {
          const input = await resultToProspect(result, batchId, {
            enableHandleDerivedGlossGenius: true,
          });
          if (input) await upsertProspect(input);
        })
      );
    } catch (e) {
      console.error("[ig-stubs/resolve] prospect upsert failed:", e);
    }
  })();

  return NextResponse.json(
    { ok: true, results, mode, processedAt: new Date().toISOString() } satisfies ResolveResponse,
    { status: 200 }
  );
}
