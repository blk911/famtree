// lib/intelligence/core/vertical-config.ts
// VerticalConfig — the definition contract every vertical must satisfy.

export interface NavItem {
  id: string;
  label: string;
  href: string;
}

export interface VerticalConfig {
  verticalKey: string;
  label: string;
  shortLabel: string;
  baseRoute: string;

  // Tool navigation items rendered in the subnav
  navItems: NavItem[];

  // Which tool IDs are active for this vertical
  enabledTools: string[];

  // Platforms/providers explicitly excluded from this vertical
  hiddenTools: string[];

  // Human-readable labels for data source keys
  sourceLabels: Record<string, string>;

  // What a single discovered entity is called
  entityLabel: string;

  // What a pipeline-qualified entity is called
  prospectLabel: string;

  // Platform identifiers allowed as evidence sources
  allowedPlatforms: string[];

  // Default seed terms for the harvest tool (empty = no defaults)
  defaultHarvestSeeds: string[];

  // Field hints that describe entity schema for this vertical
  schemaHints: string[];

  // Signals used to compute opportunity score
  scoringHints: string[];
}
