// app/api/admin/intelligence/transpo/carriers/resolve/route.ts
// POST /api/admin/intelligence/transpo/carriers/resolve
// Resolves every carrier in the Evidence Lake and upserts them into the carrier
// master store.
//
// Response (HTTP 200 for expected outcomes; 500 only for unexpected):
//   { ok: true,  resolved, created, updated, skipped, carrierCount }
//   { ok: false, error, debug }

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { readTranspoEvidence, getEvidenceFilePath } from "@/lib/intelligence/transpo/evidence-store";
import {
  readCarrierMaster,
  upsertResolvedCarrierTargets,
  getCarrierMasterFilePath,
} from "@/lib/intelligence/transpo/carrier-master-store";
import { resolveAllCarriersFromEvidence } from "@/lib/intelligence/transpo/carrier-resolver";

export async function POST() {
  const evidenceFilePath = getEvidenceFilePath();
  const carrierStorePath = getCarrierMasterFilePath();
  try {
    const evidence = await readTranspoEvidence();
    if (evidence.length === 0) {
      return NextResponse.json({
        ok: false,
        error: "Evidence lake is empty. Create evidence from a Source Run first.",
        debug: { evidenceCount: 0, evidenceFilePath, carrierStorePath },
      });
    }

    const existingMaster = await readCarrierMaster();
    const resolvedTargets = resolveAllCarriersFromEvidence(evidence, existingMaster);

    const summary = await upsertResolvedCarrierTargets(resolvedTargets);

    if (summary.persistError) {
      return NextResponse.json({
        ok: false,
        error: `Carrier master write failed: ${summary.persistError}`,
        debug: {
          evidenceCount: evidence.length,
          resolved: resolvedTargets.length,
          carrierStorePath,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      resolved: resolvedTargets.length,
      created: summary.created,
      updated: summary.updated,
      skipped: summary.skipped,
      carrierCount: summary.carrierCount,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "carrier resolution failed", detail, debug: { evidenceFilePath, carrierStorePath } },
      { status: 500 },
    );
  }
}
