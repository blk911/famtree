// POST /api/admin/intelligence/salon/public-presence/discover

export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { filterProspects, upsertProspect } from "@/lib/studios/prospects/store";
import {
  discoverSalonPublicPresence,
  mapDiscoveryToBookingFields,
} from "@/lib/intelligence/salon/public-presence/discovery-engine";
import { prospectToPublicPresenceInput } from "@/lib/intelligence/salon/public-presence/identity-extractor";
import { upsertPresenceResults } from "@/lib/intelligence/salon/public-presence/presence-store";
import type { PublicPresenceProspectInput } from "@/lib/intelligence/salon/public-presence/types";

const BodySchema = z.object({
  prospectId: z.string().optional(),
  prospect: z.record(z.unknown()).optional(),
  forceSearch: z.boolean().optional().default(false),
  enableSearch: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = BodySchema.parse(await req.json());
    let input: PublicPresenceProspectInput;

    if (body.prospectId) {
      const prospects = await filterProspects({ vertical: "salon" });
      const p = prospects.find((x) => x.prospectId === body.prospectId);
      if (!p) {
        return NextResponse.json({ ok: false, error: "prospect not found" }, { status: 404 });
      }
      input = prospectToPublicPresenceInput(p);
    } else if (body.prospect) {
      input = body.prospect as PublicPresenceProspectInput;
    } else {
      return NextResponse.json(
        { ok: false, error: "prospectId or prospect required" },
        { status: 400 },
      );
    }

    const result = await discoverSalonPublicPresence(input, {
      forceSearch: body.forceSearch,
      enableSearch: body.enableSearch ?? body.forceSearch,
      enableGgFallback: true,
    });

    await upsertPresenceResults(result.presenceResults);

    if (body.prospectId && result.bestProvider) {
      const prospects = await filterProspects({ vertical: "salon" });
      const existing = prospects.find((x) => x.prospectId === body.prospectId);
      if (existing) {
        const mapped = mapDiscoveryToBookingFields(result);
        const keepExisting =
          (existing.bookingProviderConfidence ?? 0) >= 90 &&
          (existing.bookingProviderSource === "direct_url" ||
            existing.bookingProviderSource === "link_in_bio" ||
            existing.bookingProviderSource === "link_trail") &&
          (mapped.bookingProviderConfidence ?? 0) <
            (existing.bookingProviderConfidence ?? 0);

        if (!keepExisting) {
          await upsertProspect({
            ...existing,
            ...mapped,
            providerDiscoveryDebug: {
              ...(existing.providerDiscoveryDebug ?? {}),
              providerResolverReason: mapped.providerResolverReason,
            },
          });
        }
      }
    }

    return NextResponse.json({ ok: true, result });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "discover failed", detail },
      { status: 500 },
    );
  }
}
