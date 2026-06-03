// lib/intelligence/verticals/salon.config.ts
// Salon / Client-Centric vertical — personal-care operators, fitness studios,
// education, and allied service businesses discovered via Instagram and
// appointment-platform profiles.

import type { VerticalConfig } from "../core/vertical-config";

export const salonConfig: VerticalConfig = {
  verticalKey: "salon",
  label: "Salon / Client-Centric",
  shortLabel: "Salon",
  dataScope: "Salon prospects only",
  baseRoute: "/admin/intelligence/salon",

  navItems: [
    // Discover
    { id: "source_ingest", label: "Source URL", href: "/admin/studios/source-ingest" },
    { id: "harvest", label: "Hashtag Harvest", href: "/admin/studios/creator-lab/hashtag-harvest" },
    { id: "ggen_discovery", label: "GG Seed Discovery", href: "/admin/studios/ggen-discovery" },
    // Enrich
    { id: "resolver", label: "IG Resolver", href: "/admin/studios/creator-lab/ig-stubs" },
    { id: "public_presence", label: "Public Presence", href: "/admin/studios/public-presence" },
    { id: "business_stack", label: "Business Stack", href: "/admin/studios/business-stack" },
    { id: "google_identity", label: "Google Identity", href: "/admin/studios/google-identity" },
    // Verify
    { id: "provider_provenance", label: "Provider Provenance", href: "/admin/studios/provider-provenance" },
    { id: "provider_audit", label: "Provider Audit", href: "/admin/studios/provider-audit" },
    // Qualify
    { id: "import_candidates", label: "Import Candidates", href: "/admin/studios/import-candidates" },
    { id: "qualified_operators", label: "Qualified Operators", href: "/admin/studios/qualified-operators" },
    // Operate
    { id: "prospects", label: "Prospects", href: "/admin/studios/prospects" },
    { id: "runs", label: "Runs", href: "/admin/studios/runs" },
    { id: "harvest_analytics", label: "Harvest Analytics", href: "/admin/studios/harvest-analytics" },
    { id: "backoffice", label: "Back Office Import", href: "/admin/intelligence/salon/backoffice" },
    { id: "assembler", label: "Studio Assembler", href: "/admin/studios/creator-lab" },
    // styleseat — hidden from menu; route /admin/studios/styleseat still exists
  ],

  enabledTools: ["assembler", "resolver", "harvest", "prospects", "runs", "backoffice", "source_ingest", "import_candidates", "harvest_analytics", "ggen_discovery", "public_presence", "business_stack", "provider_audit", "provider_provenance", "qualified_operators", "google_identity"],
  hiddenTools:  [],

  sourceLabels: {
    instagram:    "Instagram",
    glossgenius:  "GlossGenius",
    styleseat:    "StyleSeat",
    vagaro:       "Vagaro",
    square:       "Square",
    linktree:     "Linktree",
    beacons:      "Beacons",
    stanstore:    "Stan.Store",
    shopify:      "Shopify",
    website:      "Website",
  },

  entityLabel:    "Operator",
  prospectLabel:  "Prospect",

  allowedPlatforms: [
    "glossgenius", "styleseat", "square", "vagaro",
    "linktree", "beacons", "stanstore", "shopify",
    "instagram", "website",
  ],

  defaultHarvestSeeds: [
    "personal trainer",
    "hair salon",
    "nail salon",
    "lash studio",
    "esthetician",
    "massage therapist",
    "fitness studio",
    "yoga studio",
    "barber shop",
  ],

  schemaHints: [
    "business name",
    "IG handle",
    "booking platform",
    "service category",
    "city",
    "state",
    "review count",
    "bio link",
  ],

  scoringHints: [
    "has booking link",
    "has IG profile",
    "has website",
    "category match",
    "location match",
    "follower signal",
  ],
};
