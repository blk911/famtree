// POST /api/admin/intelligence/salon/gg-resolver/backfill

export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { filterProspects, upsertProspect } from "@/lib/studios/prospects/store";
import {
  applyGgSalonEnrichment,
  upsertInputToGgEnrichInput,
} from "@/lib/intelligence/salon/apply-gg-enrichment";
import {
  emptyGgRunDiagnostics,
  mergeGgRunDiagnostics,
  DEFAULT_GG_RESOLVER_CAP,
} from "@/lib/intelligence/salon/gg-resolver-types";
import type { ProspectRecord } from "@/lib/studios/prospects/types";
import type { UpsertInput } from "@/lib/studios/prospects/store";

const BodySchema = z.object({
  limit: z.number().int().min(1).max(500).optional().default(100),
  runGgOnAllDeduped: z.boolean().optional().default(false),
  noExistingProvider: z.boolean().optional().default(true),
});

function prospectToUpsert(p: ProspectRecord): UpsertInput {
  const { prospectId, identityFingerprint, createdAt, updatedAt, status, notes, validationStatus, archiveReason, ...rest } = p;
  return { ...rest, suggestedValidationStatus: validationStatus };
}

export async function POST(req: NextRequest) {
  try {
    const { limit, runGgOnAllDeduped, noExistingProvider } = BodySchema.parse(await req.json());
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

    const ggRun = emptyGgRunDiagnostics();
    ggRun.dedupedProspects = prospects.length;

    let updated = 0;
    for (let i = 0; i < prospects.length; i++) {
      const p = prospects[i];
      const base = prospectToUpsert(p);
      const { bookingFields, gg, runDelta } = await applyGgSalonEnrichment(
        upsertInputToGgEnrichInput(base),
        {
          index: i,
          maxProbes: runGgOnAllDeduped ? Number.MAX_SAFE_INTEGER : DEFAULT_GG_RESOLVER_CAP,
          runGgOnAllDeduped,
        },
      );
      mergeGgRunDiagnostics(ggRun, runDelta);

      await upsertProspect({
        ...base,
        ...bookingFields,
        ggResolverStatus: gg.ggResolverStatus,
        ggCheckedUrls: gg.ggCheckedUrls,
        ggResolverReason: gg.ggResolverReason,
      });
      updated++;
    }

    return NextResponse.json({
      ok: true,
      processed: updated,
      diagnostics: ggRun,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "backfill failed", detail }, { status: 500 });
  }
}
