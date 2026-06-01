// POST /api/admin/intelligence/salon/provider-discovery/backfill

export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { filterProspects, upsertProspect } from "@/lib/studios/prospects/store";
import {
  enrichSalonProviderDiscovery,
} from "@/lib/intelligence/salon/salon-provider-discovery";
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
    const errors: string[] = [];

    for (const p of prospects) {
      try {
        const base = prospectToUpsert(p);
        const input = upsertInputToGgEnrichInput(base);
        const result = await enrichSalonProviderDiscovery(input, {
          enableGgFallback: true,
        });

        const d = result.providerDiscoveryDebug;
        if (d.providerDetectedFromDirect) directProvidersFound++;
        if (d.providerDetectedFromLinkTrail) linkTrailProvidersFound++;
        if (result.ggResolverStatus === "found_handle") ggHandleMatches++;
        if (result.ggResolverStatus === "found_display") ggDisplayMatches++;
        if (!result.bookingProvider) stillUnknown++;

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
      prospectsChecked: prospects.length,
      directProvidersFound,
      linkTrailProvidersFound,
      ggHandleMatches,
      ggDisplayMatches,
      stillUnknown,
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
