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
import { listBusinessStacks } from "@/lib/intelligence/salon/business-stack/stack-store";
import { bookingProviderIdToStackId } from "@/lib/intelligence/salon/business-stack/provider-registry";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const provider = sp.get("provider");
    const source = sp.get("source");
    const confidence = (sp.get("confidence") ?? "all") as ConfidenceBucket;
    const paymentProvider = sp.get("paymentProvider");
    const checkInProvider = sp.get("checkInProvider");
    const maturity = sp.get("maturity");

    let prospects = (await filterProspects({ vertical: "salon" })).map((p) =>
      enrichProspectBookingIfMissing(p),
    );

    prospects = prospects.filter((p) => isSalonImportCandidate(p));

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

    const stacks = await listBusinessStacks({ limit: 500 });
    const stackById = new Map(stacks.map((s) => [s.prospectId, s]));

    let filtered = prospects;
    if (paymentProvider && paymentProvider !== "all") {
      filtered = filtered.filter(
        (p) => stackById.get(p.prospectId)?.primaryPaymentProvider === paymentProvider,
      );
    }
    if (checkInProvider && checkInProvider !== "all") {
      filtered = filtered.filter(
        (p) => stackById.get(p.prospectId)?.checkInProvider === checkInProvider,
      );
    }
    if (maturity && maturity !== "all") {
      filtered = filtered.filter(
        (p) => stackById.get(p.prospectId)?.operationalMaturity === maturity,
      );
    }
    if (provider && provider !== "all") {
      const stackBooking = bookingProviderIdToStackId(provider) ?? provider;
      filtered = filtered.filter((p) => {
        const stack = stackById.get(p.prospectId);
        if (stack?.primaryBookingProvider === stackBooking) return true;
        return (p.bookingProvider ?? "unknown") === provider;
      });
    }

    filtered.sort(compareImportCandidates);

    const stacksForProspects = Object.fromEntries(
      filtered
        .map((p) => [p.prospectId, stackById.get(p.prospectId)])
        .filter(([, s]) => s != null),
    );

    return NextResponse.json({
      ok: true,
      prospects: filtered,
      total: filtered.length,
      stacks: stacksForProspects,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "import candidates failed", detail },
      { status: 500 },
    );
  }
}
