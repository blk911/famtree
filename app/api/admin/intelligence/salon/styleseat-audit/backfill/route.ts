// app/api/admin/intelligence/salon/styleseat-audit/backfill/route.ts
// POST /api/admin/intelligence/salon/styleseat-audit/backfill
//
// Downgrades existing StyleSeat records whose bookingProvider="styleseat" was
// assigned from a generated candidate probe (styleseat.com/m/{handle}) that was
// rejected during identity verification.
//
// Safe: only affects records where the assignment is provably wrong.
// Skips: records from styleseat_harvest (real directory source) or where a
//        real (non-generated) StyleSeat URL exists in allMatchedUrls.
//
// POST with no body. Returns { ok, evaluated, downgraded, kept, skipped }.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { filterProspects, upsertProspect } from "@/lib/studios/prospects/store";
import { applyBookingDetection } from "@/lib/studios/prospects/store-json";
import type { ProspectRecord } from "@/lib/studios/prospects/types";
import type { UpsertInput } from "@/lib/studios/prospects/store";

// ─── Generated URL detection ──────────────────────────────────────────────────

/**
 * Returns true when the URL matches the generated probe pattern for StyleSeat.
 * The IG resolver generates `styleseat.com/m/{handle}` from the IG handle.
 * A URL that matches this pattern was constructed by us — not found via real source data.
 */
function isGeneratedStyleSeatUrl(url: string, handle: string): boolean {
  if (!url || !handle) return false;
  const h = handle.toLowerCase().replace(/^@/, "");
  const ul = h.replace(/_/g, "");
  const dl = h.replace(/\./g, "");
  const hl = h.replace(/-/g, "");
  const lower = url.toLowerCase();
  if (!lower.includes("styleseat.com/m/")) return false;
  return [h, ul, dl, hl].some(
    (v) => v.length >= 3 && (lower.endsWith(`/m/${v}`) || lower.endsWith(`/m/${v}/`)),
  );
}

// ─── Is a StyleSeat URL real (directory-sourced) vs generated? ───────────────

/**
 * Returns true when the StyleSeat URL was provided by the StyleSeat directory
 * scraper as a known anchor — i.e. it came from real source data, not generated
 * by pattern-matching the handle.
 *
 * Heuristic: a URL is "real" if it came from:
 *   - sourceTool === "styleseat_harvest" (operator is from the directory)
 *   - OR the URL appears in allMatchedUrls and was NOT in rejectedCandidateUrls
 *       (meaning it passed identity verification)
 */
function hasRealStyleSeatSource(p: ProspectRecord): boolean {
  // Came from the StyleSeat directory scraper — URL is always real
  if (p.sourceTool === "styleseat_harvest" || p.sourcePlatform === "styleseat_harvest") {
    return true;
  }

  const rejectedUrls = new Set(
    (p.rejectedCandidateUrls ?? []).map((r) =>
      typeof r === "object" ? r.url : String(r),
    ).filter(Boolean),
  );

  // Check allMatchedUrls for a non-rejected StyleSeat URL
  const confirmedSsUrl = (p.allMatchedUrls ?? []).find(
    (u) => u.url?.includes("styleseat.com") && !rejectedUrls.has(u.url),
  );
  if (confirmedSsUrl) return true;

  // Check bookingUrl itself — if it's not in rejectedUrls and is a styleseat URL
  if (p.bookingUrl?.includes("styleseat.com") && !rejectedUrls.has(p.bookingUrl)) {
    // Final check: is it the canonical generated pattern styleseat.com/m/{handle}?
    const handle = p.identity?.handle?.toLowerCase();
    if (handle) {
      const generatedPattern = `styleseat.com/m/${handle}`;
      if (p.bookingUrl.toLowerCase().includes(generatedPattern)) {
        // Could still be real if the handle happens to match the slug — ambiguous,
        // treat as generated to be conservative
        return false;
      }
    }
    // Not a generated pattern — treat as real
    return true;
  }

  return false;
}

/**
 * Returns true when the StyleSeat booking URL was demonstrably generated from
 * the IG handle pattern rather than sourced from real directory or link-in-bio data.
 *
 * Uses URL-shape detection because Postgres may not persist rejectedCandidateUrls.
 */
function isGeneratedStyleSeatAssignment(p: ProspectRecord): boolean {
  if (p.bookingProvider !== "styleseat") return false;

  const handle = p.identity?.handle?.replace(/^@/, "") ?? "";
  const styleseatUrl = p.bookingUrl ?? p.bestMatch?.url ?? "";

  // Primary check: booking URL matches styleseat.com/m/{handle_variant} pattern
  if (styleseatUrl && handle && isGeneratedStyleSeatUrl(styleseatUrl, handle)) {
    return true;
  }

  // Secondary check: any allMatchedUrls styleseat URL matches the generated pattern
  const ssMatches = (p.allMatchedUrls ?? []).filter((u) => u.url?.includes("styleseat.com"));
  if (ssMatches.length > 0 && ssMatches.every((u) => isGeneratedStyleSeatUrl(u.url, handle))) {
    return true;
  }

  // Tertiary check: appears in rejectedCandidateUrls (when that data is available)
  const rejectedUrls = new Set(
    (p.rejectedCandidateUrls ?? []).map((r) =>
      typeof r === "object" ? r.url : String(r),
    ).filter(Boolean),
  );
  if (styleseatUrl && rejectedUrls.has(styleseatUrl)) return true;

  return false;
}

// ─── Prospect → UpsertInput (for re-detection) ────────────────────────────────

function prospectToUpsertInput(p: ProspectRecord): UpsertInput {
  return {
    source: {
      sourceType:        p.source?.sourceType ?? "ig-stub-run",
      batchId:           p.source?.batchId ?? "",
      sourceHandle:      p.source?.sourceHandle ?? p.identity?.handle ?? "",
      sourceDisplayName: p.source?.sourceDisplayName ?? p.identity?.name ?? "",
    },
    vertical:       p.vertical ?? "beauty",
    sourcePlatform: p.sourcePlatform ?? "instagram",
    sourceTool:     p.sourceTool ?? "ig-stub-run",
    sourceHashtag:  p.sourceHashtag ?? null,
    sourceHashtags: p.sourceHashtags ?? [],
    sourcePath:     p.sourcePath ?? "",
    runId:          p.runId ?? null,
    harvestDate:    p.harvestDate ?? null,
    identity: {
      name:          p.identity?.name ?? "",
      handle:        p.identity?.handle ?? "",
      categoryGuess: p.identity?.categoryGuess ?? null,
      locationGuess: p.identity?.locationGuess ?? null,
    },
    educationType:  p.educationType ?? null,
    audienceType:   p.audienceType ?? null,
    sourceTopic:    p.sourceTopic ?? null,
    platforms:      p.platforms ?? [],
    bestMatch:      p.bestMatch ?? null,
    services:       p.services ?? [],
    allMatchedUrls: p.allMatchedUrls ?? [],
    evidence:       p.evidence ?? [],
    confidence:     p.confidence ?? { identityMatch: 0, bookingMatch: 0, categoryMatch: 0, locationMatch: 0, overall: 0 },
    linkTrailUrlsScanned:  p.linkTrailUrlsScanned ?? [],
    candidateUrlsTested:   p.candidateUrlsTested ?? [],
    rejectedCandidateUrls: p.rejectedCandidateUrls ?? [],
    suggestedValidationStatus: p.validationStatus ?? "new",
    // Explicitly clear the generated booking fields so applyBookingDetection re-derives them
    bookingProvider:           undefined,
    bookingProviderLabel:      undefined,
    bookingUrl:                undefined,
    bookingProviderConfidence: undefined,
    bookingProviderEvidence:   undefined,
    bookingProviderSource:     undefined,
  };
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST() {
  try {
    // 1. Find all prospects with bookingProvider="styleseat"
    const [harvestProspects, bookingProspects] = await Promise.all([
      filterProspects({ sourceTool: "styleseat_harvest" }).catch(() => [] as ProspectRecord[]),
      filterProspects({ bookingProvider: "styleseat" }).catch(() => [] as ProspectRecord[]),
    ]);

    const seen = new Set<string>();
    const allProspects: ProspectRecord[] = [];
    for (const p of [...harvestProspects, ...bookingProspects]) {
      if (!seen.has(p.prospectId)) {
        seen.add(p.prospectId);
        allProspects.push(p);
      }
    }

    let evaluated = 0;
    let downgraded = 0;
    let kept = 0;
    let skipped = 0;
    const downgradedHandles: string[] = [];
    const keptHandles: string[] = [];

    for (const p of allProspects) {
      evaluated++;

      // Skip records that don't have a StyleSeat booking provider assignment
      if (p.bookingProvider !== "styleseat") {
        skipped++;
        continue;
      }

      // Records from the StyleSeat directory scraper always have a real source URL —
      // their knownUrl is the actual scraped listing, not a generated probe.
      if (hasRealStyleSeatSource(p)) {
        kept++;
        keptHandles.push(p.identity?.handle ?? p.prospectId);
        continue;
      }

      // Only downgrade when we can confirm the URL was generated from the handle pattern.
      if (!isGeneratedStyleSeatAssignment(p)) {
        // Ambiguous — can't confirm it was generated; keep
        kept++;
        keptHandles.push(`${p.identity?.handle ?? p.prospectId} (ambiguous)`);
        continue;
      }

      // Downgrade: the booking URL was generated from the handle pattern.
      // Build a clean upsert that strips the generated styleseat booking fields
      // and filters generated appointment URLs from linkTrailUrlsScanned.
      const handle = (p.identity?.handle ?? "").replace(/^@/, "");
      const cleanTrail = (p.linkTrailUrlsScanned ?? []).filter(
        (u) => !isGeneratedStyleSeatUrl(u, handle),
      );

      const upsertInput = prospectToUpsertInput(p);
      // Clear bestMatch if it was the generated styleseat URL
      const bestMatchIsGenerated = p.bestMatch?.url
        ? isGeneratedStyleSeatUrl(p.bestMatch.url, handle)
        : false;

      // Re-run applyBookingDetection on the cleaned trail (no generated styleseat URLs)
      const cleanedInput = {
        ...upsertInput,
        bestMatch: bestMatchIsGenerated ? null : upsertInput.bestMatch,
        linkTrailUrlsScanned: cleanTrail,
        // Clear the generated booking assignment — applyBookingDetection will re-derive
        bookingProvider:           undefined,
        bookingProviderLabel:      undefined,
        bookingUrl:                undefined,
        bookingProviderConfidence: undefined,
        bookingProviderEvidence:   undefined,
        bookingProviderSource:     undefined,
      };
      const reDetected = applyBookingDetection(cleanedInput);

      if ((reDetected.bookingProvider ?? null) === "styleseat") {
        // Still styleseat even after removing generated URLs — likely a real match
        kept++;
        keptHandles.push(`${p.identity?.handle ?? p.prospectId} (still-styleseat-after-clean)`);
        continue;
      }

      // Re-upsert with the cleared/re-derived booking fields
      try {
        await upsertProspect({
          ...cleanedInput,
          bookingProvider:           reDetected.bookingProvider ?? undefined,
          bookingProviderLabel:      reDetected.bookingProviderLabel ?? undefined,
          bookingUrl:                reDetected.bookingUrl ?? undefined,
          bookingProviderConfidence: reDetected.bookingProviderConfidence ?? undefined,
          bookingProviderEvidence:   reDetected.bookingProviderEvidence ?? [],
          bookingProviderSource:     reDetected.bookingProviderSource ?? undefined,
        });
        downgraded++;
        downgradedHandles.push(p.identity?.handle ?? p.prospectId);
        console.log(
          `[ss-backfill] downgraded @${p.identity?.handle}: styleseat → ${reDetected.bookingProvider ?? "none"}`,
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[ss-backfill] upsert error for ${p.prospectId}:`, msg);
        skipped++;
      }
    }

    return NextResponse.json({
      ok: true,
      evaluated,
      downgraded,
      kept,
      skipped,
      downgradedHandles,
      keptHandles,
      summary: `Evaluated ${evaluated} prospects. Downgraded ${downgraded}. Kept ${kept}. Skipped ${skipped}.`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[ss-backfill] error:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
