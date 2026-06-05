export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { buildAndPersistProviderDossiers } from "@/lib/intelligence/transpo/provider-dossiers/build-dossiers";
import { readProviderDossierCache } from "@/lib/intelligence/transpo/provider-dossiers/dossier-store";

type Params = { params: { providerId: string } };

export async function GET(_request: Request, { params }: Params) {
  try {
    let dossiers = await readProviderDossierCache();
    if (dossiers.length === 0) {
      const built = await buildAndPersistProviderDossiers();
      dossiers = built.dossiers;
    }
    const dossier = dossiers.find((d) => d.providerId === params.providerId);
    if (!dossier) {
      return NextResponse.json({ ok: false, error: "provider not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, dossier });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "provider dossier failed", detail }, { status: 500 });
  }
}
