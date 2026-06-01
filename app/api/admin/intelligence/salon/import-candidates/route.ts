// GET /api/admin/intelligence/salon/import-candidates

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { filterProspects } from "@/lib/studios/prospects/store";
import {
  compareImportCandidates,
  isSalonImportCandidate,
  matchesConfidenceBucket,
  type ConfidenceBucket,
} from "@/lib/intelligence/salon/import-candidate";
import { enrichProspectBookingIfMissing } from "@/lib/intelligence/salon/booking-from-trail";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const provider = sp.get("provider");
    const source = sp.get("source");
    const confidence = (sp.get("confidence") ?? "all") as ConfidenceBucket;

    let prospects = (await filterProspects({ vertical: "salon" })).map((p) =>
      enrichProspectBookingIfMissing(p),
    );

    prospects = prospects.filter((p) => isSalonImportCandidate(p));

    if (provider && provider !== "all") {
      prospects = prospects.filter((p) => (p.bookingProvider ?? "unknown") === provider);
    }

    if (source && source !== "all") {
      const want = source === "link_trail" ? "link_in_bio" : source;
      prospects = prospects.filter((p) => {
        const src = p.bookingProviderSource === "link_trail" ? "link_in_bio" : p.bookingProviderSource;
        return src === want;
      });
    }

    if (confidence !== "all") {
      prospects = prospects.filter((p) =>
        matchesConfidenceBucket(p.bookingProviderConfidence, confidence),
      );
    }

    prospects.sort(compareImportCandidates);

    return NextResponse.json({ ok: true, prospects, total: prospects.length });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "import candidates failed", detail },
      { status: 500 },
    );
  }
}
