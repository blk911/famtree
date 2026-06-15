// lib/intelligence/salon/pipeline/salon-pipeline-config.ts
// Pipeline stage grouping for salon intelligence navigation (routes unchanged).

import { salonConfig } from "@/lib/intelligence/verticals/salon.config";
import type { SalonPipelineStageDef, SalonPipelineStageId } from "./pipeline-types";

export const SALON_PIPELINE_STAGES: SalonPipelineStageDef[] = [
  {
    id: "discover",
    order: 1,
    label: "Discover",
    description: "Find operators from directories, hashtags, and seed lists.",
    purpose: "Find operators",
    navItemIds: ["source_ingest", "harvest", "ggen_discovery"],
    primaryHref: "/admin/studios/source-ingest",
    primaryActionLabel: "Open Source URL",
  },
  {
    id: "enrich",
    order: 2,
    label: "Enrich",
    description: "Build resolver, presence, stack, and Google signals.",
    purpose: "Learn about operators",
    navItemIds: ["resolver", "public_presence", "business_stack", "google_identity"],
    primaryHref: "/admin/studios/public-presence",
    primaryActionLabel: "Open Public Presence",
  },
  {
    id: "verify",
    order: 3,
    label: "Verify",
    description: "Validate provider trust and assignment explainability.",
    purpose: "Verify trust and explainability",
    navItemIds: ["provider_provenance", "provider_audit"],
    primaryHref: "/admin/studios/provider-provenance",
    primaryActionLabel: "Open Provider Provenance",
  },
  {
    id: "qualify",
    order: 4,
    label: "Qualify",
    description: "Review import candidates and qualified operators.",
    purpose: "Determine who is actionable",
    navItemIds: ["import_candidates", "qualified_operators"],
    primaryHref: "/admin/studios/qualified-operators",
    primaryActionLabel: "Open Qualified Operators",
  },
  {
    id: "operate",
    order: 5,
    label: "Operate",
    description: "Manage prospects, runs, analytics, imports, and assembly.",
    purpose: "Operate the system",
    navItemIds: ["prospects", "runs", "harvest_analytics", "backoffice", "assembler"],
    primaryHref: "/admin/studios/prospects",
    primaryActionLabel: "Open Prospects",
  },
];

const NAV_ID_TO_STAGE = new Map<string, SalonPipelineStageId>();
for (const stage of SALON_PIPELINE_STAGES) {
  for (const navId of stage.navItemIds) {
    NAV_ID_TO_STAGE.set(navId, stage.id);
  }
}

export function pipelineStageForNavItem(navItemId: string): SalonPipelineStageId | null {
  return NAV_ID_TO_STAGE.get(navItemId) ?? null;
}

export function pipelineStageDef(id: SalonPipelineStageId): SalonPipelineStageDef {
  const def = SALON_PIPELINE_STAGES.find((s) => s.id === id);
  if (!def) throw new Error(`Unknown pipeline stage: ${id}`);
  return def;
}

/** Longest-prefix match against salon nav hrefs */
export function pipelineStageForPathname(pathname: string): SalonPipelineStageId {
  const sorted = [...salonConfig.navItems].sort((a, b) => b.href.length - a.href.length);
  const match = sorted.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
  );
  if (match) {
    const stage = pipelineStageForNavItem(match.id);
    if (stage) return stage;
  }
  if (
    pathname === "/admin/discovery" ||
    pathname.startsWith("/admin/discovery?") ||
    pathname === "/admin/studios" ||
    pathname.startsWith("/admin/studios?")
  ) {
    return "discover";
  }
  return "discover";
}
