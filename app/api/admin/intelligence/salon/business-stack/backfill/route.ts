// POST /api/admin/intelligence/salon/business-stack/backfill

export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { filterProspects } from "@/lib/studios/prospects/store";
import { runSalonStackBackfill } from "@/lib/intelligence/salon/business-stack/backfill-runner";

const BodySchema = z.object({
  limit: z.number().int().min(1).max(250).optional().default(50),
  onlyUnknown: z.boolean().optional().default(false),
  crawlWebsite: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const { limit, onlyUnknown, crawlWebsite } = BodySchema.parse(await req.json());
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

    const summary = await runSalonStackBackfill(prospects, {
      crawlWebsite,
      persistBookingUpgrade: true,
    });

    return NextResponse.json(summary);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        ok: false,
        error: "backfill_batch_setup_failed",
        detail,
        checked: 0,
        stacksCreated: 0,
        stacksUpdated: 0,
        providersFound: 0,
        bookingProvidersFound: 0,
        paymentProvidersFound: 0,
        checkInProvidersFound: 0,
        websiteBuildersFound: 0,
        skippedNoUrls: 0,
        failed: 0,
        errors: [detail],
        sample: [],
        results: [],
      },
      { status: 500 },
    );
  }
}
