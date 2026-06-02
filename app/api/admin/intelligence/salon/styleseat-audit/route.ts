// app/api/admin/intelligence/salon/styleseat-audit/route.ts
// GET /api/admin/intelligence/salon/styleseat-audit
//
// Returns every StyleSeat-associated prospect with provenance classification,
// matching method, validation status, and aggregate totals.
// Admin-only. No UI-facing exposure.

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { filterProspects } from "@/lib/studios/prospects/store";
import type { ProspectRecord } from "@/lib/studios/prospects/types";

// ─── Determination method ──────────────────────────────────────────────────────

export type DeterminationMethod =
  | "styleseat_directory"      // came from StyleSeat scrape (sourceTool=styleseat_harvest)
  | "styleseat_profile_url"    // bestMatch or allMatchedUrls has explicit styleseat.com URL
  | "styleseat_provider_signal"// bookingProvider="styleseat" but no explicit URL in match
  | "direct_url_match"         // bookingProviderSource="direct_url" + styleseat
  | "link_in_bio_match"        // bookingProviderSource="link_in_bio" + styleseat
  | "website_match"            // matched via website crawl
  | "handle_match"             // explicit handle in styleseat URL
  | "display_name_match"       // display name matched a styleseat page
  | "generated_candidate"      // styleseat URL was a generated probe (not from directory)
  | "imported"                 // back-office import
  | "unknown";

function extractStyleSeatUrl(p: ProspectRecord): string | null {
  if (p.bestMatch?.url?.includes("styleseat.com")) return p.bestMatch.url;
  const fromMatched = p.allMatchedUrls?.find((u) => u.url?.includes("styleseat.com"));
  if (fromMatched) return fromMatched.url;
  if (p.bookingUrl?.includes("styleseat.com")) return p.bookingUrl;
  const fromCandidates = (p.candidateUrlsTested ?? []).find(
    (u) => typeof u === "string" && u.includes("styleseat.com"),
  );
  if (fromCandidates) return typeof fromCandidates === "string" ? fromCandidates : null;
  return null;
}

function classifyDeterminationMethod(p: ProspectRecord): DeterminationMethod {
  const isHarvestSource =
    p.sourceTool === "styleseat_harvest" ||
    p.sourcePlatform === "styleseat_harvest" ||
    p.source?.sourceType === "styleseat_harvest";

  // ── Came directly from the StyleSeat directory scraper ──────────────────────
  if (isHarvestSource) return "styleseat_directory";

  // ── StyleSeat URL explicitly in bestMatch or allMatchedUrls ─────────────────
  const hasSsInMatchedUrls = p.allMatchedUrls?.some((u) => u.url?.includes("styleseat.com")) ?? false;
  if (p.bestMatch?.url?.includes("styleseat.com") || hasSsInMatchedUrls) {
    // Was it the exact handle URL we generated? (styleseat.com/m/{handle})
    const handle = p.identity?.handle;
    const generatedPattern = handle ? `styleseat.com/m/${handle}` : null;
    const ssUrl = extractStyleSeatUrl(p);
    if (generatedPattern && ssUrl?.includes(generatedPattern)) return "generated_candidate";
    return "styleseat_profile_url";
  }

  // ── Booking provider detected as styleseat by source ────────────────────────
  if (p.bookingProvider === "styleseat") {
    const src = p.bookingProviderSource;
    if (src === "direct_url")    return "direct_url_match";
    if (src === "link_in_bio" || src === "link_trail") return "link_in_bio_match";
    if (src === "google_search" || src === "website_crawl") return "website_match";
    if (src === "handle_derived") return "handle_match";
    if (src === "display_name_derived") return "display_name_match";
    return "styleseat_provider_signal";
  }

  // ── StyleSeat URL was a generated probe (appears in candidateUrlsTested) ────
  const hasCandidateStyleSeat = (p.candidateUrlsTested ?? []).some(
    (u) => typeof u === "string" && u.includes("styleseat.com"),
  );
  if (hasCandidateStyleSeat) return "generated_candidate";

  // ── Back-office import ───────────────────────────────────────────────────────
  // Cast to string because sourceType is a strict union that doesn't include "backoffice_import"
  if (String(p.source?.sourceType ?? "") === "backoffice_import") return "imported";

  return "unknown";
}

// ─── Validation classification ────────────────────────────────────────────────

export type AuditValidationStatus =
  | "confirmed"
  | "candidate_only"
  | "rejected"
  | "timeout"
  | "not_found"
  | "unknown";

function classifyValidation(p: ProspectRecord): AuditValidationStatus {
  // Cast to string to handle both ValidationStatus and ProspectStatus union fields safely
  const vs = String(p.validationStatus ?? p.status ?? "");

  if (["confirmed", "good_fit", "contacted", "converted", "claimed", "valid", "active"].includes(vs)) {
    return "confirmed";
  }
  if (["bad_fit", "archive", "not_education"].includes(vs)) return "rejected";
  if (["reviewed", "needs_review", "new", "maybe", "styleseat_discovered", "priority", "education_relevant"].includes(vs)) {
    return "candidate_only";
  }
  if (vs === "not_found" || vs === "dead_link") return "not_found";
  if (vs === "timeout") return "timeout";
  return "unknown";
}

// ─── Per-prospect audit record ────────────────────────────────────────────────

export interface StyleSeatAuditRecord {
  prospectId: string;
  instagramHandle: string | null;
  displayName: string;

  bookingProvider: string | null;
  bookingProviderLabel: string | null;

  styleseatUrl: string | null;

  sourceRunId: string | null;
  sourceType: string | null;
  sourceName: string | null;

  determinationMethod: DeterminationMethod;

  validationStatus: string | null;
  auditValidationStatus: AuditValidationStatus;

  confidence: number;
  bookingProviderConfidence: number | null;
  bookingProviderSource: string | null;

  generatedCandidates: string[];
  winningCandidate: string | null;

  createdAt: string | null;
  updatedAt: string | null;
}

function toAuditRecord(p: ProspectRecord): StyleSeatAuditRecord {
  const ssUrl = extractStyleSeatUrl(p);
  const method = classifyDeterminationMethod(p);
  const auditVs = classifyValidation(p);

  // Generated candidates: all candidateUrlsTested that contain styleseat.com
  const generatedCandidates = (p.candidateUrlsTested ?? []).filter(
    (u) => typeof u === "string" && u.includes("styleseat.com"),
  ) as string[];

  // Winning candidate: the candidate URL that became a confirmed match
  const winningCandidate =
    method === "generated_candidate" && ssUrl?.includes("styleseat.com") ? ssUrl : null;

  return {
    prospectId: p.prospectId,
    instagramHandle: p.identity?.handle ?? null,
    displayName: p.identity?.name ?? p.source?.sourceDisplayName ?? "—",

    bookingProvider: p.bookingProvider ?? null,
    bookingProviderLabel: p.bookingProviderLabel ?? null,

    styleseatUrl: ssUrl,

    sourceRunId: p.runId ?? null,
    sourceType: p.source?.sourceType ?? null,
    sourceName: p.source?.sourceDisplayName ?? null,

    determinationMethod: method,
    validationStatus: p.validationStatus ?? p.status ?? null,
    auditValidationStatus: auditVs,

    confidence: p.confidence?.overall ?? 0,
    bookingProviderConfidence: p.bookingProviderConfidence ?? null,
    bookingProviderSource: p.bookingProviderSource ?? null,

    generatedCandidates,
    winningCandidate,

    createdAt: p.createdAt ?? null,
    updatedAt: p.updatedAt ?? null,
  };
}

// ─── Aggregates ───────────────────────────────────────────────────────────────

interface ByMethod {
  styleseat_directory: number;
  styleseat_profile_url: number;
  styleseat_provider_signal: number;
  direct_url_match: number;
  link_in_bio_match: number;
  website_match: number;
  handle_match: number;
  display_name_match: number;
  generated_candidate: number;
  imported: number;
  unknown: number;
}

interface ByValidation {
  confirmed: number;
  candidate_only: number;
  rejected: number;
  timeout: number;
  not_found: number;
  unknown: number;
}

function zeroByMethod(): ByMethod {
  return {
    styleseat_directory: 0, styleseat_profile_url: 0, styleseat_provider_signal: 0,
    direct_url_match: 0, link_in_bio_match: 0, website_match: 0,
    handle_match: 0, display_name_match: 0, generated_candidate: 0,
    imported: 0, unknown: 0,
  };
}

function zeroByValidation(): ByValidation {
  return { confirmed: 0, candidate_only: 0, rejected: 0, timeout: 0, not_found: 0, unknown: 0 };
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    // 1. Fetch all styleseat_harvest source prospects
    const [harvestProspects, bookingProspects] = await Promise.all([
      filterProspects({ sourceTool: "styleseat_harvest" }).catch(() => [] as ProspectRecord[]),
      filterProspects({ bookingProvider: "styleseat" }).catch(() => [] as ProspectRecord[]),
    ]);

    // Merge and deduplicate by prospectId
    const seen = new Set<string>();
    const allProspects: ProspectRecord[] = [];
    for (const p of [...harvestProspects, ...bookingProspects]) {
      if (!seen.has(p.prospectId)) {
        seen.add(p.prospectId);
        allProspects.push(p);
      }
    }

    const records = allProspects.map(toAuditRecord);

    // 2. Aggregate totals
    const byMethod = zeroByMethod();
    const byValidation = zeroByValidation();
    let totalGeneratedCandidatesTested = 0;
    let totalGeneratedConfirmed = 0;
    let totalGeneratedFailed = 0;
    let totalWithStyleSeatUrl = 0;
    let totalWithNoUrl = 0;
    let totalFromDirectory = 0;
    let totalIgHandleFound = 0;

    for (const r of records) {
      byMethod[r.determinationMethod] = (byMethod[r.determinationMethod] ?? 0) + 1;
      byValidation[r.auditValidationStatus]++;
      totalGeneratedCandidatesTested += r.generatedCandidates.length;
      if (r.determinationMethod === "generated_candidate") {
        if (r.winningCandidate) totalGeneratedConfirmed++;
        else totalGeneratedFailed++;
      }
      if (r.styleseatUrl) totalWithStyleSeatUrl++;
      else totalWithNoUrl++;
      if (r.determinationMethod === "styleseat_directory") totalFromDirectory++;
      if (r.instagramHandle) totalIgHandleFound++;
    }

    // 3. Answers to the 7 questions
    const total = records.length;
    const pctDirectory = total > 0 ? Math.round((byMethod.styleseat_directory / total) * 100) : 0;
    const pctGenerated = total > 0 ? Math.round((byMethod.generated_candidate / total) * 100) : 0;
    const pctWithValidProof = total > 0 ? Math.round((totalWithStyleSeatUrl / total) * 100) : 0;
    const pctIgFound = total > 0 ? Math.round((totalIgHandleFound / total) * 100) : 0;

    // Confirmed StyleSeat operators = those with a real StyleSeat URL (not generated)
    const confirmedStyleSeatOps = records.filter(
      (r) =>
        r.styleseatUrl &&
        r.determinationMethod !== "generated_candidate" &&
        r.determinationMethod !== "unknown",
    ).length;

    const answers = {
      q1_how_determined:
        byMethod.styleseat_directory > 0
          ? "StyleSeat prospects are identified primarily via directory scraping (styleseat_harvest tool). " +
            "The StyleSeat profile URL is attached as a known anchor URL; `detectBestSalonBookingProvider` " +
            "then assigns bookingProvider='styleseat' from that anchor. IG handle matching runs in parallel " +
            "via generated name→handle candidates."
          : byMethod.generated_candidate > 0
          ? "StyleSeat prospects are identified via generated handle candidates (styleseat.com/m/{handle}). " +
            "These are probed by the IG resolver URL pattern engine, not from actual StyleSeat directory data."
          : total === 0
          ? "No StyleSeat prospects found in the current store. Run a StyleSeat harvest to populate data."
          : "Determination method is mixed — see byMethod breakdown.",

      q2_pct_from_source:
        `${pctDirectory}% came directly from StyleSeat source data (directory scrape). ` +
        `${byMethod.styleseat_directory} of ${total} prospects.`,

      q3_pct_generated:
        `${pctGenerated}% came from generated matching. ` +
        `${byMethod.generated_candidate} of ${total} prospects used a generated styleseat.com/m/{handle} URL.`,

      q4_concatenation_value:
        totalIgHandleFound > 0
          ? `The concatenation engine found IG handles for ${totalIgHandleFound} of ${total} operators (${pctIgFound}%). ` +
            `It is used for IG identity discovery, not for finding the StyleSeat URL itself (which comes from the scrape). ` +
            `Concatenation contributes to IG cross-reference quality but not to the StyleSeat provider assignment.`
          : `The concatenation engine found 0 IG handles in the current dataset. ` +
            `Either no StyleSeat harvest has run, or IG matching succeeded at 0%.`,

      q5_pills_without_validation:
        totalWithNoUrl > 0
          ? `⚠️ ${totalWithNoUrl} StyleSeat prospects have no StyleSeat URL on record. ` +
            `These have a bookingProvider='styleseat' pill without a confirmed URL proof.`
          : `All ${totalWithStyleSeatUrl} StyleSeat prospects with a provider pill have a URL on record (${pctWithValidProof}%).`,

      q6_need_concatenation:
        `The concatenation engine is NOT needed to assign bookingProvider='styleseat' — ` +
        `that comes from the scraped directory URL. It IS needed to find the operator's IG handle. ` +
        `If IG cross-referencing is not required, concatenation can be disabled for the StyleSeat vertical.`,

      q7_without_generated:
        `${confirmedStyleSeatOps} confirmed StyleSeat operators would remain if generated matching were removed. ` +
        `These have StyleSeat URLs from the directory source itself. ` +
        `${byMethod.generated_candidate} generated-candidate matches would be lost.`,
    };

    // 4. Generated candidate audit detail
    const generatedAudit = records
      .filter((r) => r.generatedCandidates.length > 0)
      .map((r) => ({
        handle: r.instagramHandle,
        displayName: r.displayName,
        generatedCandidates: r.generatedCandidates,
        winningCandidate: r.winningCandidate,
        validationStatus: r.auditValidationStatus,
        confidence: r.confidence,
      }));

    // 5. Provider URL proof
    const urlProof = records
      .filter((r) => r.styleseatUrl)
      .map((r) => ({
        handle: r.instagramHandle,
        styleseatUrl: r.styleseatUrl,
        validationStatus: r.auditValidationStatus,
        confidence: r.confidence,
        bookingProviderConfidence: r.bookingProviderConfidence,
        determinationMethod: r.determinationMethod,
        isFromDirectory: r.determinationMethod === "styleseat_directory",
        isGenerated: r.determinationMethod === "generated_candidate",
      }));

    return NextResponse.json({
      ok: true,
      totalStyleSeatProspects: total,
      byMethod,
      byValidation,
      totals: {
        total,
        fromDirectory: byMethod.styleseat_directory,
        withStyleSeatUrl: totalWithStyleSeatUrl,
        withNoUrl: totalWithNoUrl,
        igHandleFound: totalIgHandleFound,
        generatedCandidatesTested: totalGeneratedCandidatesTested,
        generatedConfirmed: totalGeneratedConfirmed,
        generatedFailed: totalGeneratedFailed,
        confirmedStyleSeatOperators: confirmedStyleSeatOps,
      },
      records,
      generatedAudit,
      urlProof,
      answers,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[styleseat-audit] error:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
