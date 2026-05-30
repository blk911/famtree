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
  baseRoute: "/admin/intelligence/transpo",

  navItems: [
    { id: "source-ingest", label: "Source Ingest",   href: "/admin/intelligence/transpo/source-ingest" },
    { id: "resolver",      label: "Carrier Resolver", href: "/admin/intelligence/transpo/resolver" },
    { id: "harvest",       label: "Market Harvest",   href: "/admin/intelligence/transpo/harvest" },
    { id: "prospects",     label: "Red Dots",         href: "/admin/intelligence/transpo/prospects" },
  ],

  enabledTools: ["source-ingest", "resolver", "harvest", "prospects"],

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
