// lib/intelligence/transpo/pipeline/service-deficits-nav-groups.ts
// Grouped navigation for Service Deficits stage — all tools visible, no URL typing.

export type ServiceDeficitsNavGroup = {
  id: string;
  label: string;
  navItemIds: string[];
};

export const SERVICE_DEFICITS_NAV_GROUPS: ServiceDeficitsNavGroup[] = [
  {
    id: "market_analysis",
    label: "Market Analysis",
    navItemIds: [
      "opportunity-synthesis",
      "county-opportunities",
      "market-gaps",
      "opportunity-radar",
      "network-plays",
      "demand-generators",
    ],
  },
  {
    id: "capacity_evidence",
    label: "Capacity & Evidence",
    navItemIds: [
      "provider-capacity",
      "missing-evidence",
      "research-queue",
      "data-confidence",
    ],
  },
  {
    id: "reporting_intelligence",
    label: "Reporting Intelligence",
    navItemIds: [
      "reporting-live-opportunities",
      "data-owners",
      "reporting-registry",
      "reporting-signals",
    ],
  },
  {
    id: "advanced",
    label: "Advanced",
    navItemIds: ["reporting-live-targets", "reporting-acquisition"],
  },
];

/** Hub page for the stage — always reachable via pipeline primary action. */
export const SERVICE_DEFICITS_HUB_ID = "service-deficits";

export function allServiceDeficitsNavItemIds(): string[] {
  const ids = [SERVICE_DEFICITS_HUB_ID];
  for (const group of SERVICE_DEFICITS_NAV_GROUPS) {
    ids.push(...group.navItemIds);
  }
  return ids;
}
