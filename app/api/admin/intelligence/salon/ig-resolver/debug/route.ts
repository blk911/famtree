// app/api/admin/intelligence/salon/ig-resolver/debug/route.ts
// POST /api/admin/intelligence/salon/ig-resolver/debug
//
// Full resolver trace for a list of handles — no DB writes, no GG fallback.
// Use to diagnose why a handle resolves or doesn't.
//
// Body: { handles: string[] }
// Returns: { ok, results: ResolverTrace[], profileFetchError }

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
import type { IgSeed, ResolverTrace } from "@/lib/studios/creator-lab/ig-stubs/types";

const BodySchema = z.object({
  handles: z.array(z.string().min(1).max(60)).min(1).max(10),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.errors[0]?.message }, { status: 400 });
  }

  const handles = parsed.data.handles.map(sanitizeHandle).filter(Boolean);
  const seeds: IgSeed[] = handles.map((h) => ({ handle: h, displayName: h }));

  // Step 1: batch IG profile fetch
  const profileFetch = await fetchIgProfiles(handles);

  const traces: ResolverTrace[] = await Promise.all(
    seeds.map(async (seed) => {
      const igProfile = profileFetch.profiles.get(seed.handle.toLowerCase()) ?? null;

      const directUrls: string[] = [];
      if (igProfile?.externalUrl) directUrls.push(igProfile.externalUrl);
      directUrls.push(...(igProfile?.extraExternalUrls ?? []));

      let providerFromDirectUrl: string | null = null;
      let providerFromDirectUrlSource: string | null = null;
      let websiteUrl: string | null = null;
      let decisionStatus = "unresolved";
      let decisionBestUrl: string | null = null;
      let decisionPlatform: string | null = null;
      let decisionConfidence = 0;
      let decisionReason = "No match found";

      if (directUrls.length > 0) {
        const detection = detectBestSalonBookingProvider({ urls: directUrls });
        if (detection && detection.provider !== "unknown" && detection.bookingUrl) {
          providerFromDirectUrl = detection.provider;
          providerFromDirectUrlSource = "ig_direct_url";
          const conf = detection.confidence === "high" ? 95 : detection.confidence === "medium" ? 75 : 55;
          decisionStatus = "resolved";
          decisionBestUrl = detection.bookingUrl;
          decisionPlatform = detection.provider;
          decisionConfidence = conf;
          decisionReason = `${detection.providerLabel} booking URL from IG profile externalUrl.`;
        } else {
          websiteUrl = directUrls.find(
            (u) => u.startsWith("http") && !u.includes("instagram.com") && !isLinkInBioUrl(u)
          ) ?? null;
          if (websiteUrl) {
            decisionStatus = "partial";
            decisionBestUrl = websiteUrl;
            decisionPlatform = "website";
            decisionConfidence = 65;
            decisionReason = "Public website found from IG profile. No booking platform detected.";
          }
        }
      }

      // If direct path resolved, skip generated candidates
      let linkTrailBookingUrls: string[] = [];
      let candidateCount = 0;

      if (decisionStatus === "unresolved") {
        const candidates = generateCandidateUrls(seed.handle);
        candidateCount = candidates.length;
        const tracked = await fastResolveTracked(seed, candidates);
        linkTrailBookingUrls = tracked.linkTrailUrls;

        if (tracked.confirmedProfiles.length > 0) {
          const best = tracked.confirmedProfiles[0];
          decisionStatus = best.confidenceScore >= 50 ? "resolved" : "partial";
          decisionBestUrl = best.url;
          decisionPlatform = best.platform;
          decisionConfidence = best.confidenceScore;
          decisionReason = best.matchReason;
        } else if (linkTrailBookingUrls.length > 0) {
          const trailDetection = detectBestSalonBookingProvider({ urls: linkTrailBookingUrls });
          if (trailDetection?.bookingUrl && trailDetection.provider !== "unknown") {
            decisionStatus = "partial";
            decisionBestUrl = trailDetection.bookingUrl;
            decisionPlatform = trailDetection.provider;
            decisionConfidence = trailDetection.confidence === "high" ? 80 : 65;
            decisionReason = `${trailDetection.providerLabel} URL found in link-in-bio trail.`;
          }
        }
      }

      return {
        handle: seed.handle,
        profileFetch: {
          attempted: profileFetch.apifyOk,
          found: igProfile?.found ?? false,
          externalUrl: igProfile?.externalUrl ?? null,
          biography: igProfile?.biography ?? null,
          bioUrls: igProfile?.extraExternalUrls ?? [],
          error: profileFetch.error ?? igProfile?.error ?? null,
        },
        extracted: {
          allDirectUrls: directUrls,
          providerFromDirectUrl,
          providerFromDirectUrlSource,
          websiteUrl,
        },
        generatedCandidates: {
          count: candidateCount,
          linkTrailBookingUrls,
        },
        resolverDecision: {
          status: decisionStatus,
          bestUrl: decisionBestUrl,
          platform: decisionPlatform,
          confidence: decisionConfidence,
          reason: decisionReason,
        },
      } satisfies ResolverTrace;
    })
  );

  return NextResponse.json({
    ok: true,
    profileFetchRunId: profileFetch.runId,
    profileFetchError: profileFetch.error,
    results: traces,
  });
}
