// lib/intelligence/transpo/source-registry.ts
// Declarative registry of Transpo intelligence data sources.
// Describes what each source is, its operational status, the source modes it
// can emit, and what it's primarily used for. This is metadata only — no live
// calls — so it always loads without API keys.

import type { TranspoSource, TranspoSourceMode } from "./types";

export type TranspoSourceStatus = "mock" | "available" | "placeholder" | "disabled";

export type TranspoSourceRegistryEntry = {
  id: TranspoSource;
  label: string;
  description: string;
  status: TranspoSourceStatus;
  modes: TranspoSourceMode[];
  primaryUse: string;
  outputTypes: string[];
};

const REGISTRY: TranspoSourceRegistryEntry[] = [
  {
    id: "fmcsa",
    label: "FMCSA",
    description:
      "Federal carrier registry (USDOT/MC). Mock test pulls today; CSV import and live API are swappable providers.",
    status: "mock",
    modes: ["mock_fmcsa_test", "csv_import", "live_api"],
    primaryUse: "Carrier discovery and authority/identity baseline",
    outputTypes: ["carrier_record"],
  },
  {
    id: "safer",
    label: "SAFER",
    description:
      "SAFER snapshot enrichment for a known USDOT — authority, fleet, and identity signals. Manual/derived for now.",
    status: "available",
    modes: ["manual", "unknown"],
    primaryUse: "Enrich a known carrier with authority/fleet evidence",
    outputTypes: ["evidence"],
  },
  {
    id: "website",
    label: "Website",
    description:
      "Hiring-signal scanner over carrier website text (provided page text only; no live crawling yet).",
    status: "available",
    modes: ["manual", "unknown"],
    primaryUse: "Detect hiring intent and careers signals",
    outputTypes: ["evidence"],
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    description: "Company/people signals from LinkedIn. Not connected yet.",
    status: "placeholder",
    modes: ["unknown"],
    primaryUse: "Company profile and hiring signals",
    outputTypes: ["evidence"],
  },
  {
    id: "facebook",
    label: "Facebook",
    description: "Business page signals from Facebook. Not connected yet.",
    status: "placeholder",
    modes: ["unknown"],
    primaryUse: "Business presence and contact signals",
    outputTypes: ["evidence"],
  },
  {
    id: "google_business",
    label: "Google Business",
    description: "Google Business Profile signals (location, contact, reviews). Not connected yet.",
    status: "placeholder",
    modes: ["unknown"],
    primaryUse: "Location and contact verification",
    outputTypes: ["evidence"],
  },
];

export function getTranspoSourceRegistry(): TranspoSourceRegistryEntry[] {
  return REGISTRY;
}

export function getTranspoSourceById(
  id: string,
): TranspoSourceRegistryEntry | undefined {
  return REGISTRY.find((entry) => entry.id === id);
}
