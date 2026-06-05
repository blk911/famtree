// lib/intelligence/transpo/provider-dossiers/build-dossiers.ts

import { readCarrierMaster } from "../carrier-master-store";
import { readTranspoEvidence } from "../evidence-store";
import { readCarrierVerifications } from "../verification-store";
import { buildAllProviderDossiers } from "./dossier-engine";
import { writeProviderDossierCache } from "./dossier-store";
import type { TranspoProviderDossier } from "./dossier-types";

export type ProviderDossierBuildResult = {
  carriersProcessed: number;
  dossiersBuilt: number;
  dossiers: TranspoProviderDossier[];
  persistWarning?: string;
};

export async function buildAndPersistProviderDossiers(): Promise<ProviderDossierBuildResult> {
  const [carriers, verifications, evidence] = await Promise.all([
    readCarrierMaster(),
    readCarrierVerifications(),
    readTranspoEvidence(),
  ]);

  const dossiers = buildAllProviderDossiers({ carriers, verifications, evidence });
  const persistWarning = (await writeProviderDossierCache(dossiers)) ?? undefined;

  return {
    carriersProcessed: carriers.length,
    dossiersBuilt: dossiers.length,
    dossiers,
    persistWarning,
  };
}
