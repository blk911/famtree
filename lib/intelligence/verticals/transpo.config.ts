// lib/intelligence/verticals/transpo.config.ts
// Transportation vertical — carriers, fleets, owner-operators.
// Sources: FMCSA, SAFER, DOT, public websites, LinkedIn, job boards.
//
// EXPLICITLY EXCLUDES all salon/personal-care platforms:
//   GlossGenius, StyleSeat, Vagaro, salon suite providers,
//   personal-care hashtag seeds, and creator/art language.

import type { VerticalConfig } from "../core/vertical-config";

export const transpoConfig: VerticalConfig = {
  verticalKey: "transpo",
  label: "Transpo",
  shortLabel: "Transpo",
  dataScope: "Carrier and fleet intelligence only",
  baseRoute: "/admin/intelligence/transpo",

  navItems: [
    { id: "source-ingest", label: "Source Ingest",   href: "/admin/intelligence/transpo/source-ingest" },
    { id: "source-runs",   label: "Source Runs",      href: "/admin/intelligence/transpo/source-runs" },
    { id: "evidence",      label: "Evidence",         href: "/admin/intelligence/transpo/evidence" },
    { id: "resolver",      label: "Carrier Resolver", href: "/admin/intelligence/transpo/resolver" },
    { id: "carriers",        label: "Carriers",         href: "/admin/intelligence/transpo/carriers" },
    { id: "verification",    label: "Verification",     href: "/admin/intelligence/transpo/verification" },
    { id: "opportunities",   label: "Opportunities",    href: "/admin/intelligence/transpo/opportunities" },
    { id: "qualified-targets", label: "Qualified Targets", href: "/admin/intelligence/transpo/qualified-targets" },
    { id: "market-dashboard", label: "Market Dashboard", href: "/admin/intelligence/transpo/market-dashboard" },
    { id: "market-gaps",      label: "Market Gaps",      href: "/admin/intelligence/transpo/market-gaps" },
    { id: "service-deficits", label: "Service Deficits", href: "/admin/intelligence/transpo/service-deficits" },
    { id: "data-confidence",  label: "Data Confidence", href: "/admin/intelligence/transpo/data-confidence" },
    { id: "opportunity-radar", label: "Opportunity Radar", href: "/admin/intelligence/transpo/opportunity-radar" },
    { id: "county-opportunities", label: "County Opportunities", href: "/admin/intelligence/transpo/county-opportunities" },
    { id: "provider-dossiers", label: "Provider Intelligence", href: "/admin/intelligence/transpo/provider-dossiers" },
    { id: "action-queue",    label: "Action Queue",     href: "/admin/intelligence/transpo/action-queue" },
    { id: "reviews",         label: "Reviews",          href: "/admin/intelligence/transpo/reviews" },
    { id: "storage-status",  label: "Storage Status", href: "/admin/intelligence/transpo/storage-status" },
    { id: "harvest",         label: "Market Harvest",   href: "/admin/intelligence/transpo/harvest" },
    { id: "prospects",       label: "Red Dots (deprecated)", href: "/admin/intelligence/transpo/prospects" },
  ],

  enabledTools: ["source-ingest", "source-runs", "evidence", "resolver", "carriers", "verification", "opportunities", "qualified-targets", "market-dashboard", "market-gaps", "service-deficits", "data-confidence", "opportunity-radar", "county-opportunities", "provider-dossiers", "action-queue", "reviews", "storage-status", "harvest"],

  // Salon/personal-care tools are explicitly hidden from this vertical
  hiddenTools: [
    "glossgenius", "styleseat", "vagaro",
    "salon-suite", "education-seeds", "hashtag-harvest-personal-care",
  ],

  sourceLabels: {
    fmcsa:    "FMCSA",
    safer:    "SAFER",
    dot:      "DOT",
    linkedin: "LinkedIn",
    website:  "Website",
    google:   "Google",
    indeed:   "Indeed",
    csv:      "CSV Upload",
  },

  entityLabel:   "Carrier",
  prospectLabel: "Red Dot",

  // No salon/appointment platforms — transport-relevant sources only
  allowedPlatforms: [
    "website", "google", "linkedin",
    "fmcsa", "safer", "dot", "indeed",
  ],

  defaultHarvestSeeds: [],   // Transport seeds populated per run via FMCSA/DOT

  schemaHints: [
    "USDOT number",
    "MC number",
    "carrier name",
    "fleet size",
    "drivers",
    "authority type",
    "address",
    "inspection score",
    "safety rating",
    "out-of-service rate",
  ],

  scoringHints: [
    "has USDOT",
    "has MC number",
    "has website",
    "fleet size signal",
    "authority active",
    "safety signals",
    "hiring signal",
  ],
};
