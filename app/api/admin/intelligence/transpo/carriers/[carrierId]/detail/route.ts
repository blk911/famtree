// app/api/admin/intelligence/transpo/carriers/[carrierId]/detail/route.ts
// GET → the full intelligence record for a single carrier: identity/FMCSA,
// verification (state entity, Google, website crawl), opportunity score+signals,
// recent evidence, source links, and notes. Powers the Carrier Opportunity
// Detail Drawer. HTTP 200 with { ok:false, debug } when the carrier is missing.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { readCarrierMaster, carrierIdentityKey } from "@/lib/intelligence/transpo/carrier-master-store";
import { readCarrierVerifications } from "@/lib/intelligence/transpo/verification-store";
import { readTranspoEvidence } from "@/lib/intelligence/transpo/evidence-store";
import { buildOpportunities } from "@/lib/intelligence/transpo/opportunity-engine";
import type { TranspoCarrierTarget } from "@/lib/intelligence/transpo/types";
import type { TranspoCarrierVerification } from "@/lib/intelligence/transpo/verification-types";

type SourceLink = { label: string; url: string };

function buildSourceLinks(
  carrier: TranspoCarrierTarget,
  verification: TranspoCarrierVerification | undefined,
): SourceLink[] {
  const links: SourceLink[] = [];
  const dot = (carrier.dotNumber ?? "").trim();
  if (dot) {
    links.push({
      label: "FMCSA SAFER",
      url: `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&query_string=${encodeURIComponent(dot)}`,
    });
  }
  if (verification?.stateEntityUrl) {
    links.push({ label: "Colorado SOS", url: verification.stateEntityUrl });
  }
  if (verification?.googleMapsUrl) {
    links.push({ label: "Google Maps", url: verification.googleMapsUrl });
  }
  const website =
    verification?.websiteFinalUrl || verification?.websiteUrl || verification?.googleWebsite || carrier.website;
  if ((website ?? "").trim()) {
    links.push({ label: "Website", url: (website as string).trim() });
  }
  return links;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { carrierId: string } },
) {
  const carrierId = decodeURIComponent(params.carrierId ?? "").trim();

  try {
    const [carriers, verifications, evidence] = await Promise.all([
      readCarrierMaster(),
      readCarrierVerifications(),
      readTranspoEvidence(),
    ]);

    // Find the carrier by id → dotNumber → identity key.
    const carrier =
      carriers.find((c) => c.id === carrierId) ||
      carriers.find((c) => (c.dotNumber ?? "").trim() === carrierId) ||
      carriers.find((c) => carrierIdentityKey(c) === carrierId);

    if (!carrier) {
      return NextResponse.json({
        ok: false,
        error: "Carrier not found in carrier master.",
        debug: {
          carrierId,
          carrierCount: carriers.length,
          verificationCount: verifications.length,
          evidenceCount: evidence.length,
        },
      });
    }

    const carrierKey = carrierIdentityKey(carrier);

    // Verification: by carrierId, then carrierKey.
    const verification =
      verifications.find((v) => v.carrierId === carrier.id) ||
      (carrierKey ? verifications.find((v) => v.carrierKey === carrierKey) : undefined);

    // Evidence: by carrierKey, then by the carrier's recorded evidenceIds.
    const evidenceIdSet = new Set(carrier.evidenceIds ?? []);
    const carrierEvidence = evidence
      .filter((e) => (carrierKey && e.carrierKey === carrierKey) || evidenceIdSet.has(e.id))
      .sort((a, b) => Date.parse(b.observedAt ?? "") - Date.parse(a.observedAt ?? ""))
      .slice(0, 25);

    // Opportunity: score the whole master (so signals match the Opportunities
    // page exactly) and pick this carrier's record.
    const opportunities = buildOpportunities(carriers, verifications);
    const opportunity = opportunities.find((o) => o.id === carrier.id) ?? null;

    const sourceLinks = buildSourceLinks(carrier, verification);
    const notes = verification?.notes ?? [];

    return NextResponse.json({
      ok: true,
      carrier,
      verification: verification ?? null,
      evidence: carrierEvidence,
      opportunity,
      sourceLinks,
      notes,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: "carrier detail lookup failed",
        detail: e instanceof Error ? e.message : String(e),
        debug: { carrierId },
      },
      { status: 500 },
    );
  }
}
