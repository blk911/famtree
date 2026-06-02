// POST /api/admin/intelligence/salon/business-stack/resolve

export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { filterProspects, upsertProspect } from "@/lib/studios/prospects/store";
import { enrichProspectWithBusinessStack } from "@/lib/intelligence/salon/business-stack/apply-stack-enrichment";
import { prospectToStackInput } from "@/lib/intelligence/salon/business-stack/stack-engine";
import type { ProspectRecord } from "@/lib/studios/prospects/types";
import type { UpsertInput } from "@/lib/studios/prospects/store";

const BodySchema = z.object({
  prospectId: z.string().optional(),
  prospect: z.record(z.unknown()).optional(),
  crawlWebsite: z.boolean().optional().default(false),
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
    const body = BodySchema.parse(await req.json());
    let input: ReturnType<typeof prospectToStackInput>;

    if (body.prospectId) {
      const prospects = await filterProspects({ vertical: "salon" });
      const p = prospects.find((x) => x.prospectId === body.prospectId);
      if (!p) {
        return NextResponse.json({ ok: false, error: "prospect not found" }, { status: 404 });
      }
      input = prospectToStackInput(p);
    } else if (body.prospect) {
      input = body.prospect as ReturnType<typeof prospectToStackInput>;
    } else {
      return NextResponse.json(
        { ok: false, error: "prospectId or prospect required" },
        { status: 400 },
      );
    }

    const { stack, bookingUpgrade } = await enrichProspectWithBusinessStack({
      ...input,
      prospectId: body.prospectId ?? input.prospectId,
      website: input.website ?? undefined,
      bioUrl: input.bioUrl ?? undefined,
      bestMatchUrl: input.bestMatchUrl ?? undefined,
      bookingUrl: input.bookingUrl ?? undefined,
      linkInBioUrl: input.linkInBioUrl ?? undefined,
    },
      { crawlWebsite: body.crawlWebsite, persist: true },
    );

    if (body.prospectId && bookingUpgrade) {
      const prospects = await filterProspects({ vertical: "salon" });
      const existing = prospects.find((x) => x.prospectId === body.prospectId);
      if (existing) {
        await upsertProspect({
          ...prospectToUpsert(existing),
          bookingProvider: bookingUpgrade.bookingProvider,
          bookingProviderLabel: bookingUpgrade.bookingProviderLabel,
          bookingUrl: bookingUpgrade.bookingUrl,
          bookingProviderConfidence: bookingUpgrade.bookingProviderConfidence,
          bookingProviderEvidence: bookingUpgrade.bookingProviderEvidence,
          bookingProviderSource: bookingUpgrade.bookingProviderSource,
        });
      }
    }

    return NextResponse.json({ ok: true, stack });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "resolve failed", detail },
      { status: 500 },
    );
  }
}
