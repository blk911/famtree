// lib/intelligence/transpo/opportunity-dossiers/build-county-opportunities.ts

import { readProviderDossierCache } from "../provider-dossiers/dossier-store";
import { buildAndPersistProviderDossiers } from "../provider-dossiers/build-dossiers";
import { readServiceDeficitCache } from "../service-deficits/deficit-store";
import { buildCountyOpportunityDossiers } from "./county-opportunity-engine";
import { writeCountyOpportunityCache } from "./county-opportunity-store";
import type { CountyOpportunityDossier } from "./county-opportunity-types";

export type CountyOpportunityBuildResult = {
  deficitsProcessed: number;
  dossiersBuilt: number;
  dossiers: CountyOpportunityDossier[];
  persistWarning?: string;
};

export async function buildAndPersistCountyOpportunities(): Promise<CountyOpportunityBuildResult> {
  let deficits = await readServiceDeficitCache();
  let providerDossiers = await readProviderDossierCache();

  if (providerDossiers.length === 0) {
    const built = await buildAndPersistProviderDossiers();
    providerDossiers = built.dossiers;
  }

  const dossiers = buildCountyOpportunityDossiers(deficits, providerDossiers);
  const persistWarning = (await writeCountyOpportunityCache(dossiers)) ?? undefined;

  return {
    deficitsProcessed: deficits.length,
    dossiersBuilt: dossiers.length,
    dossiers,
    persistWarning,
  };
}
