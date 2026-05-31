// app/api/admin/intelligence/transpo/opportunities/route.ts
// GET /api/admin/intelligence/transpo/opportunities
// Scores the carrier master through the Opportunity Signal Engine and returns
// opportunity records, highest score first.
//
// Response: { ok: true, opportunities: TranspoOpportunityRecord[], carrierCount }

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { readCarrierMaster } from "@/lib/intelligence/transpo/carrier-master-store";
import { readCarrierVerifications } from "@/lib/intelligence/transpo/verification-store";
import { buildOpportunities } from "@/lib/intelligence/transpo/opportunity-engine";

export async function GET() {
  const [carriers, verifications] = await Promise.all([
    readCarrierMaster(),
    readCarrierVerifications(),
  ]);
  const opportunities = buildOpportunities(carriers, verifications);
  return NextResponse.json({
    ok: true,
    opportunities,
    carrierCount: carriers.length,
    verificationCount: verifications.length,
  });
}
