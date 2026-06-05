export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { buildAndPersistProviderDossiers } from "@/lib/intelligence/transpo/provider-dossiers/build-dossiers";
import { buildAndPersistCountyOpportunities } from "@/lib/intelligence/transpo/opportunity-dossiers/build-county-opportunities";

export async function POST() {
  try {
    const result = await buildAndPersistProviderDossiers();
    await buildAndPersistCountyOpportunities();
    return NextResponse.json({
      ok: true,
      carriersProcessed: result.carriersProcessed,
      dossiersBuilt: result.dossiersBuilt,
      ...(result.persistWarning ? { persistWarning: result.persistWarning } : {}),
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "dossier backfill failed", detail }, { status: 500 });
  }
}
