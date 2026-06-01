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
    { id: "styleseat",  label: "StyleSeat Discovery",    href: "/admin/studios/styleseat" },
    { id: "prospects",  label: "Prospects",              href: "/admin/studios/prospects" },
    { id: "runs",       label: "Runs",                   href: "/admin/studios/runs" },
    { id: "backoffice", label: "Back Office Import",     href: "/admin/intelligence/salon/backoffice" },
  ],

  enabledTools: ["assembler", "resolver", "harvest", "styleseat", "prospects", "runs", "backoffice"],
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
