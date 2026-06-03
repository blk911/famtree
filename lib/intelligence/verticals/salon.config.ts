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
    { id: "assembler",  label: "Studio Assembler",     href: "/admin/studios/creator-lab" },
    { id: "resolver",   label: "IG Resolver",            href: "/admin/studios/creator-lab/ig-stubs" },
    { id: "harvest",    label: "Hashtag Harvest",        href: "/admin/studios/creator-lab/hashtag-harvest" },
    // styleseat — hidden from menu for now; route /admin/studios/styleseat still exists
    { id: "prospects",  label: "Prospects",              href: "/admin/studios/prospects" },
    { id: "runs",       label: "Runs",                   href: "/admin/studios/runs" },
    { id: "backoffice", label: "Back Office Import",     href: "/admin/intelligence/salon/backoffice" },
    { id: "import_candidates", label: "Import Candidates", href: "/admin/studios/import-candidates" },
    { id: "harvest_analytics", label: "Harvest Analytics", href: "/admin/studios/harvest-analytics" },
    { id: "ggen_discovery", label: "GG Seed Discovery", href: "/admin/studios/ggen-discovery" },
    { id: "public_presence", label: "Public Presence", href: "/admin/studios/public-presence" },
    { id: "business_stack", label: "Business Stack", href: "/admin/studios/business-stack" },
    { id: "provider_audit", label: "Provider Audit", href: "/admin/studios/provider-audit" },
    { id: "provider_provenance", label: "Provider Provenance", href: "/admin/studios/provider-provenance" },
    { id: "qualified_operators", label: "Qualified Operators", href: "/admin/studios/qualified-operators" },
    { id: "google_identity", label: "Google Identity", href: "/admin/studios/google-identity" },
  ],

  enabledTools: ["assembler", "resolver", "harvest", "prospects", "runs", "backoffice", "import_candidates", "harvest_analytics", "ggen_discovery", "public_presence", "business_stack", "provider_audit", "provider_provenance", "qualified_operators", "google_identity"],
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
