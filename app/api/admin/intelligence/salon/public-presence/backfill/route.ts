// POST /api/admin/intelligence/salon/public-presence/backfill

export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { filterProspects, upsertProspect } from "@/lib/studios/prospects/store";
import {
  discoverSalonPublicPresence,
  mapDiscoveryToBookingFields,
} from "@/lib/intelligence/salon/public-presence/discovery-engine";
import { prospectToPublicPresenceInput } from "@/lib/intelligence/salon/public-presence/identity-extractor";
import { upsertPresenceResults } from "@/lib/intelligence/salon/public-presence/presence-store";
import type { ProspectRecord } from "@/lib/studios/prospects/types";
import type { UpsertInput } from "@/lib/studios/prospects/store";

const BodySchema = z.object({
  limit: z.number().int().min(1).max(250).optional().default(50),
  forceSearch: z.boolean().optional().default(false),
  onlyUnknown: z.boolean().optional().default(false),
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
    const { limit, forceSearch, onlyUnknown } = BodySchema.parse(await req.json());
    let prospects = await filterProspects({ vertical: "salon" });

    if (onlyUnknown) {
      prospects = prospects.filter(
        (p) =>
          !p.bookingProvider ||
          p.bookingProvider === "unknown" ||
          (p.bookingProviderConfidence ?? 0) < 65,
      );
    }

    prospects = prospects
      .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1))
      .slice(0, limit);

    let providersFound = 0;
    let searchQueriesRun = 0;
    let resultsScanned = 0;
    let ggFallbackUsed = 0;
    const errors: string[] = [];
    const sampleResults: Array<{
      handle: string;
      provider?: string;
      source?: string;
      confidence?: number;
    }> = [];

    for (const p of prospects) {
      try {
        const input = prospectToPublicPresenceInput(p);
        const result = await discoverSalonPublicPresence(input, {
          forceSearch,
          enableSearch: forceSearch,
          enableGgFallback: true,
        });

        searchQueriesRun += result.diagnostics.searchQueriesRun;
        resultsScanned += result.diagnostics.searchResultsScanned;
        if (result.diagnostics.ggFallbackAttempted) ggFallbackUsed++;
        await upsertPresenceResults(result.presenceResults);

        if (result.bestProvider) {
          providersFound++;
          if (sampleResults.length < 8) {
            sampleResults.push({
              handle: p.identity.handle,
              provider: result.bestProvider.provider,
              source: result.bestProvider.source,
              confidence: result.bestProvider.confidence,
            });
          }

          const mapped = mapDiscoveryToBookingFields(result);
          const keepExisting =
            (p.bookingProviderConfidence ?? 0) >= 90 &&
            (p.bookingProviderSource === "direct_url" ||
              p.bookingProviderSource === "link_in_bio" ||
              p.bookingProviderSource === "link_trail") &&
            (mapped.bookingProviderConfidence ?? 0) < (p.bookingProviderConfidence ?? 0);

          if (!keepExisting) {
            const base = prospectToUpsert(p);
            await upsertProspect({
              ...base,
              ...mapped,
              providerResolverReason: mapped.providerResolverReason,
              providerDiscoveryDebug: {
                ...(p.providerDiscoveryDebug ?? {}),
                providerResolverReason: mapped.providerResolverReason,
              },
            });
          }
        }
      } catch (e) {
        errors.push(
          `${p.identity.handle}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    return NextResponse.json({
      ok: true,
      checked: prospects.length,
      providersFound,
      ggFallbackUsed,
      searchQueriesRun,
      resultsScanned,
      errors,
      sampleResults,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "backfill failed", detail },
      { status: 500 },
    );
  }
}
