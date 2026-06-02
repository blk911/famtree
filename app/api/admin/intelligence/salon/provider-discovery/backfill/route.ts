// POST /api/admin/intelligence/salon/provider-discovery/backfill

export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { filterProspects, upsertProspect } from "@/lib/studios/prospects/store";
import { enrichSalonProviderDiscovery } from "@/lib/intelligence/salon/salon-provider-discovery";
import { initProviderBackfillStats } from "@/lib/intelligence/salon/provider-validation/revalidate-prospect-booking";
import { upsertInputToGgEnrichInput } from "@/lib/intelligence/salon/apply-gg-enrichment";
import type { ProspectRecord } from "@/lib/studios/prospects/types";
import type { UpsertInput } from "@/lib/studios/prospects/store";

const BodySchema = z.object({
  limit: z.number().int().min(1).max(500).optional().default(100),
  noExistingProvider: z.boolean().optional().default(false),
});

function prospectToUpsert(p: ProspectRecord): UpsertInput {
  const {
    prospectId,
    identityFingerprint,
    createdAt,
    updatedAt,
    status,
    notes,
    validationStatus,
    archiveReason,
    ...rest
  } = p;
  return { ...rest, suggestedValidationStatus: validationStatus };
}

export async function POST(req: NextRequest) {
  try {
    const { limit, noExistingProvider } = BodySchema.parse(await req.json());
    let prospects = await filterProspects({ vertical: "salon" });

    if (noExistingProvider) {
      prospects = prospects.filter(
        (p) =>
          !p.bookingProvider ||
          p.bookingProvider === "unknown" ||
          (p.bookingProviderConfidence ?? 0) < 90,
      );
    }

    prospects = prospects
      .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1))
      .slice(0, limit);

    let directProvidersFound = 0;
    let linkTrailProvidersFound = 0;
    let ggHandleMatches = 0;
    let ggDisplayMatches = 0;
    let stillUnknown = 0;
    let oldHandleMatchesReviewed = 0;
    let confirmedKept = 0;
    let downgradedCandidateOnly = 0;
    let genericHomepageRejected = 0;
    const errors: string[] = [];
    const stats = initProviderBackfillStats();

    for (const p of prospects) {
      try {
        const base = prospectToUpsert(p);
        const input = upsertInputToGgEnrichInput(base);
        const hadHandleGg =
          p.bookingProvider === "glossgenius" &&
          (p.bookingProviderSource === "handle_derived" ||
            p.bookingProviderSource === "display_name_derived");

        const result = await enrichSalonProviderDiscovery(input, {
          enableGgFallback: true,
        });

        const d = result.providerDiscoveryDebug;
        if (d.providerDetectedFromDirect) directProvidersFound++;
        if (d.providerDetectedFromLinkTrail) linkTrailProvidersFound++;
        if (result.ggResolverStatus === "found_handle") ggHandleMatches++;
        if (result.ggResolverStatus === "found_display") ggDisplayMatches++;
        if (!result.bookingProvider) stillUnknown++;

        if (hadHandleGg) {
          oldHandleMatchesReviewed++;
          if (result.ggValidationStatus === "confirmed_client_page" && result.bookingProvider === "glossgenius") {
            confirmedKept++;
          } else if (
            result.ggValidationStatus === "generic_glossgenius_page" ||
            result.ggValidationStatus === "redirect_home"
          ) {
            genericHomepageRejected++;
          } else if (!result.bookingProvider || result.ggValidationStatus === "candidate_only") {
            downgradedCandidateOnly++;
          }
        }

        const pv = result.providerDiscoveryDebug.providerValidation;
        stats.candidatesFound += pv?.candidates?.length ?? 0;
        for (const v of pv?.validations ?? []) {
          stats.validationsRun++;
          if (v.confirmed) {
            stats.confirmedProviders++;
            stats.providersByType[v.provider] = (stats.providersByType[v.provider] ?? 0) + 1;
          } else if (
            v.status === "rejected_generic_homepage" ||
            v.status === "rejected_marketing_page" ||
            v.status === "rejected_redirect_home"
          ) {
            stats.rejectedGenericHomepage++;
          } else if (v.status === "rejected_not_found") {
            stats.rejectedNotFound++;
          }
        }
        if (hadHandleGg && !result.bookingProvider) {
          stats.downgradedFalsePositives++;
        }

        await upsertProspect({
          ...base,
          bookingProvider: result.bookingProvider,
          bookingProviderLabel: result.bookingProviderLabel,
          bookingUrl: result.bookingUrl,
          bookingProviderConfidence: result.bookingProviderConfidence,
          bookingProviderEvidence: result.bookingProviderEvidence,
          bookingProviderSource: result.bookingProviderSource,
          ggResolverStatus: result.ggResolverStatus,
          ggCheckedUrls: result.ggCheckedUrls ?? d.ggCheckedUrls,
          ggCandidateUrls: result.ggCandidateUrls,
          ggValidatedUrl: result.ggValidatedUrl,
          ggValidationStatus: result.ggValidationStatus,
          ggResolverReason: result.ggResolverReason,
          providerResolverReason: d.providerResolverReason,
          providerDiscoveryDebug: d,
        });
      } catch (e) {
        errors.push(
          `${p.identity.handle}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    return NextResponse.json({
      ok: true,
      checked: prospects.length,
      prospectsChecked: prospects.length,
      directProvidersFound,
      linkTrailProvidersFound,
      ggHandleMatches,
      ggDisplayMatches,
      stillUnknown,
      oldHandleMatchesReviewed,
      confirmedKept,
      downgradedCandidateOnly,
      genericHomepageRejected,
      candidatesFound: stats.candidatesFound,
      validationsRun: stats.validationsRun,
      confirmedProviders: stats.confirmedProviders,
      rejectedGenericHomepage: stats.rejectedGenericHomepage,
      rejectedNotFound: stats.rejectedNotFound,
      downgradedFalsePositives: stats.downgradedFalsePositives,
      providersByType: stats.providersByType,
      errors,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "provider backfill failed", detail },
      { status: 500 },
    );
  }
}
