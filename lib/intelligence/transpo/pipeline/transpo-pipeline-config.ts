// lib/intelligence/transpo/pipeline/transpo-pipeline-config.ts

import { transpoConfig } from "@/lib/intelligence/verticals/transpo.config";

export type TranspoPipelineStageId =
  | "discover"
  | "enrich"
  | "verify"
  | "qualify"
  | "service_deficits"
  | "operate";

export type TranspoPipelineStageDef = {
  id: TranspoPipelineStageId;
  order: number;
  label: string;
  description: string;
  navItemIds: string[];
  primaryHref: string;
  primaryActionLabel: string;
};

export const TRANSPO_PIPELINE_STAGES: TranspoPipelineStageDef[] = [
  {
    id: "discover",
    order: 1,
    label: "Discover",
    description: "Source ingest, runs, and evidence.",
    navItemIds: ["source-ingest", "source-runs", "evidence", "harvest"],
    primaryHref: "/admin/intelligence/transpo/source-ingest",
    primaryActionLabel: "Open Source Ingest",
  },
  {
    id: "enrich",
    order: 2,
    label: "Enrich",
    description: "Resolver, verification, carrier master.",
    navItemIds: ["resolver", "verification", "carriers"],
    primaryHref: "/admin/intelligence/transpo/resolver",
    primaryActionLabel: "Open Resolver",
  },
  {
    id: "verify",
    order: 3,
    label: "Verify",
    description: "Market dashboard and supply/demand signals.",
    navItemIds: ["market-dashboard"],
    primaryHref: "/admin/intelligence/transpo/market-dashboard",
    primaryActionLabel: "Open Market Dashboard",
  },
  {
    id: "qualify",
    order: 4,
    label: "Qualify",
    description: "Opportunities and qualified targets.",
    navItemIds: ["opportunities", "qualified-targets"],
    primaryHref: "/admin/intelligence/transpo/opportunities",
    primaryActionLabel: "Open Opportunities",
  },
  {
    id: "service_deficits",
    order: 5,
    label: "Service Deficits",
    description: "Need → payer → provider → coverage deficits.",
    navItemIds: ["market-gaps", "service-deficits", "data-confidence", "opportunity-radar", "network-plays", "county-opportunities", "demand-generators", "provider-capacity", "missing-evidence", "research-queue"],
    primaryHref: "/admin/intelligence/transpo/service-deficits",
    primaryActionLabel: "Open Service Deficits",
  },
  {
    id: "operate",
    order: 6,
    label: "Operate",
    description: "Decide and track market-entry actions from opportunity to execution.",
    navItemIds: ["action-queue", "qualified-targets", "provider-dossiers", "reviews", "storage-status"],
    primaryHref: "/admin/intelligence/transpo/action-queue",
    primaryActionLabel: "Open Action Queue",
  },
];

export function pipelineStageForNavItem(navItemId: string): TranspoPipelineStageId | null {
  const stage = TRANSPO_PIPELINE_STAGES.find((s) => s.navItemIds.includes(navItemId));
  return stage?.id ?? null;
}

export function pipelineStageForPathname(pathname: string): TranspoPipelineStageId {
  const sorted = [...transpoConfig.navItems].sort((a, b) => b.href.length - a.href.length);
  const match = sorted.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  if (match) {
    const stage = pipelineStageForNavItem(match.id);
    if (stage) return stage;
  }
  return "discover";
}

export function pipelineStageDef(id: TranspoPipelineStageId): TranspoPipelineStageDef {
  return TRANSPO_PIPELINE_STAGES.find((s) => s.id === id) ?? TRANSPO_PIPELINE_STAGES[0];
}
