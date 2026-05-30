// lib/intelligence/verticals/hcare.config.ts
// Healthcare vertical — medical practices, clinics, allied health operators.
// Placeholder config — tools TBD.

import type { VerticalConfig } from "../core/vertical-config";

export const hcareConfig: VerticalConfig = {
  verticalKey: "hcare",
  label: "HCare",
  shortLabel: "HCare",
  baseRoute: "/admin/intelligence/hcare",

  navItems: [],  // TBD

  enabledTools:  [],
  hiddenTools:   [],
  sourceLabels:  {},

  entityLabel:   "Practice",
  prospectLabel: "Opportunity",

  allowedPlatforms:    [],
  defaultHarvestSeeds: [],
  schemaHints:         [],
  scoringHints:        [],
};
