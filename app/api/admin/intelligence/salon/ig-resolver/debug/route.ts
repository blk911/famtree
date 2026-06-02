// POST /api/admin/intelligence/salon/ig-resolver/debug

export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sanitizeHandle } from "@/lib/studios/creator-lab/ig-stubs/url-patterns";
import { fetchAndResolveIgSeeds } from "@/lib/studios/creator-lab/ig-stubs/resolve-seed";
import { buildSalonIgResolverTrace } from "@/lib/intelligence/salon/ig-resolver-trace";
import { upsertProspect } from "@/lib/studios/prospects/store";
import { resultToProspect, generateBatchId } from "@/lib/studios/prospects/from-resolver";
import {
  applyGgSalonEnrichment,
  upsertInputToGgEnrichInput,
} from "@/lib/intelligence/salon/apply-gg-enrichment";

const BodySchema = z.object({
  handles: z.array(z.string().min(1).max(60)).min(1).max(10),
  persist: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const { handles: rawHandles, persist } = BodySchema.parse(await req.json());
    const handles = rawHandles.map(sanitizeHandle).filter(Boolean);
    const seeds = handles.map((h) => ({ handle: h, displayName: h }));

    const { profileFetch, results } = await fetchAndResolveIgSeeds(seeds, "fast");
    const batchId = generateBatchId();

    const traces = await Promise.all(
      results.map(async (result, i) => {
        const handle = handles[i];
        const persistenceErrors: string[] = [];
        let prospectId: string | null = null;
        const fieldsUpdated: string[] = [];

        if (persist) {
          try {
            let upsertInput = await resultToProspect(result, batchId, {
              skipLegacyBookingEnrichment: true,
              vertical: "salon",
            });
            if (upsertInput) {
              const enrich = await applyGgSalonEnrichment(
                upsertInputToGgEnrichInput(upsertInput),
                { index: 0, runGgOnAllDeduped: true },
              );
              upsertInput = {
                ...upsertInput,
                ...enrich.bookingFields,
                providerDiscoveryDebug: {
                  ...upsertInput.providerDiscoveryDebug,
                  ...enrich.bookingFields.providerDiscoveryDebug,
                  urlsScanned: upsertInput.providerDiscoveryDebug?.urlsScanned,
                  externalUrl: upsertInput.providerDiscoveryDebug?.externalUrl,
                  bioUrls: upsertInput.providerDiscoveryDebug?.bioUrls,
                },
              };
              const saved = await upsertProspect(upsertInput);
              prospectId = saved.prospectId;
              if (saved.bestMatch?.url) fieldsUpdated.push("bestMatchUrl");
              if (saved.linkTrailUrlsScanned?.length) {
                fieldsUpdated.push("linkTrailUrlsScanned");
              }
              if (saved.bookingProvider) fieldsUpdated.push("bookingProvider");
            }
          } catch (e) {
            persistenceErrors.push(e instanceof Error ? e.message : String(e));
          }
        }

        const trace = buildSalonIgResolverTrace({
          handle,
          displayName: result.seed.displayName,
          trace: result.trace!,
          result,
          prospectId,
          persistenceErrors,
        });
        trace.persistence.fieldsUpdated = fieldsUpdated.length
          ? fieldsUpdated
          : trace.persistence.fieldsUpdated;

        return trace;
      }),
    );

    return NextResponse.json({
      ok: true,
      profileFetchRunId: profileFetch.runId,
      profileFetchError: profileFetch.error,
      apifyOk: profileFetch.apifyOk,
      results: traces,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "ig-resolver debug failed", detail },
      { status: 500 },
    );
  }
}
