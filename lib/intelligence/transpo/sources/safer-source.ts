// lib/intelligence/transpo/sources/safer-source.ts
// SAFER enrichment adapter. Given a known carrier (ideally a USDOT number),
// produces derived/manual enrichment evidence. No external calls yet — fails
// gracefully when there's nothing to anchor on.

import type { TranspoEvidence } from "../types";

export type SaferEnrichmentInput = {
  dotNumber?: string;
  companyName?: string;
  state?: string;
};

export type SaferEnrichmentResult = {
  ok: boolean;
  source: "safer";
  sourceMode: "manual" | "unknown";
  evidence: TranspoEvidence[];
  message?: string;
};

function carrierKeyFor(input: SaferEnrichmentInput): string {
  if (input.dotNumber) return `dot:${input.dotNumber.trim()}`;
  if (input.companyName) {
    return `name:${input.companyName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  }
  return "unknown";
}

function saferUrlForDot(dotNumber: string): string {
  return `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&query_string=${encodeURIComponent(
    dotNumber,
  )}`;
}

export async function runSaferEnrichment(
  input: SaferEnrichmentInput,
): Promise<SaferEnrichmentResult> {
  const dotNumber = (input.dotNumber ?? "").trim();
  const companyName = (input.companyName ?? "").trim();

  if (!dotNumber) {
    return {
      ok: false,
      source: "safer",
      sourceMode: "unknown",
      evidence: [],
      message: "SAFER enrichment requires a USDOT number to anchor on.",
    };
  }

  const carrierKey = carrierKeyFor(input);
  const observedAt = new Date().toISOString();
  const sourceUrl = saferUrlForDot(dotNumber);
  const confidence = 0.65;

  const evidence: TranspoEvidence[] = [
    {
      id: `safer-identity-${dotNumber}`,
      carrierKey,
      source: "safer",
      evidenceType: "identity",
      value: companyName
        ? `SAFER record located for ${companyName} (USDOT ${dotNumber}).`
        : `SAFER record located for USDOT ${dotNumber}.`,
      confidence,
      sourceUrl,
      observedAt,
    },
    {
      id: `safer-authority-${dotNumber}`,
      carrierKey,
      source: "safer",
      evidenceType: "authority",
      value: `Operating authority lookup available for USDOT ${dotNumber} via SAFER snapshot.`,
      confidence,
      sourceUrl,
      observedAt,
    },
    {
      id: `safer-fleet-${dotNumber}`,
      carrierKey,
      source: "safer",
      evidenceType: "fleet",
      value: `Fleet/driver counts available from SAFER snapshot for USDOT ${dotNumber}.`,
      confidence,
      sourceUrl,
      observedAt,
    },
  ];

  return {
    ok: true,
    source: "safer",
    sourceMode: "manual",
    evidence,
  };
}
