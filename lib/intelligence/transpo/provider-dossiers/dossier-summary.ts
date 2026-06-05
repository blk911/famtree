// lib/intelligence/transpo/provider-dossiers/dossier-summary.ts

import type { TranspoProviderDossier, TranspoProviderDossierSummary } from "./dossier-types";

export function buildProviderDossierSummary(
  dossiers: TranspoProviderDossier[],
): TranspoProviderDossierSummary {
  const verified = dossiers.filter(
    (d) => d.verificationStatus === "verified" || (d.verificationScore ?? 0) >= 60,
  ).length;
  const strong = dossiers.filter((d) => d.contactabilityBand === "strong").length;
  const weak = dossiers.filter((d) => d.contactabilityBand === "weak").length;
  const avgContact =
    dossiers.length > 0
      ? Math.round(dossiers.reduce((s, d) => s + d.contactabilityScore, 0) / dossiers.length)
      : 0;
  const withFleet = dossiers.filter((d) => (d.fleetSize ?? 0) > 0);
  const avgFleet =
    withFleet.length > 0
      ? Math.round(withFleet.reduce((s, d) => s + (d.fleetSize ?? 0), 0) / withFleet.length)
      : 0;

  return {
    totalProviders: dossiers.length,
    verifiedProviders: verified,
    strongContactability: strong,
    weakContactability: weak,
    averageContactability: avgContact,
    averageFleetSize: avgFleet,
  };
}
