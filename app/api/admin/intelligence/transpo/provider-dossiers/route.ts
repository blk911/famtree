export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { buildAndPersistProviderDossiers } from "@/lib/intelligence/transpo/provider-dossiers/build-dossiers";
import { buildProviderDossierSummary } from "@/lib/intelligence/transpo/provider-dossiers/dossier-summary";
import { readProviderDossierCache } from "@/lib/intelligence/transpo/provider-dossiers/dossier-store";
import { dossiersForCounty } from "@/lib/intelligence/transpo/provider-dossiers/dossier-engine";

export async function GET(request: NextRequest) {
  try {
    let dossiers = await readProviderDossierCache();
    const fromCache = dossiers.length > 0;

    if (!fromCache) {
      const built = await buildAndPersistProviderDossiers();
      dossiers = built.dossiers;
    }

    const county = request.nextUrl.searchParams.get("county");
    const state = request.nextUrl.searchParams.get("state") ?? "CO";
    if (county) {
      dossiers = dossiersForCounty(dossiers, county, state);
    }

    const summary = buildProviderDossierSummary(dossiers);
    return NextResponse.json({ ok: true, summary, dossiers, meta: { fromCache, count: dossiers.length } });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "provider dossiers failed", detail }, { status: 500 });
  }
}
