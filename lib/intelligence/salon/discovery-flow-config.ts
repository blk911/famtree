// lib/intelligence/salon/discovery-flow-config.ts
//
// Market Intel Discovery operating flow (UI navigation only — routes unchanged):
//
//   Inputs → Resolve → Qualify → Operate → Runs
//
// Route map:
//   Inputs
//     /admin/studios/source-ingest          Source URL / directory input
//     /admin/studios/creator-lab/hashtag-harvest
//     /admin/studios/ggen-discovery         GG Seed discovery
//     /admin/intelligence/salon/backoffice  Back Office Import
//   Resolve
//     /admin/studios/public-presence
//     /admin/studios/creator-lab/ig-stubs   IG Resolver / URL backfill
//     /admin/studios/business-stack
//     /admin/studios/google-identity
//     /admin/studios/harvest-analytics
//   Qualify
//     /admin/studios/provider-provenance
//     /admin/studios/provider-audit
//     /admin/studios/import-candidates
//     /admin/studios/qualified-operators
//   Operate
//     /admin/studios/prospects
//     /admin/studios/creator-lab            Studio Assembler
//     /studios/inbox                        Concierge Inbox (external shell)
//   Runs (audit — last, not the next step after Prospects)
//     /admin/studios/runs

import { salonConfig } from "@/lib/intelligence/verticals/salon.config";

export type DiscoveryFlowStageId = "inputs" | "resolve" | "qualify" | "operate" | "runs";

export type DiscoveryFlowTool = {
  id: string;
  label: string;
  href: string;
  /** Nav id from salon.config when applicable */
  navId?: string;
  external?: boolean;
  comingSoon?: boolean;
};

export type DiscoveryFlowStageDef = {
  id: DiscoveryFlowStageId;
  order: number;
  label: string;
  description: string;
  primaryHref: string;
  tools: DiscoveryFlowTool[];
  /** Maps to legacy pipeline summary count keys (API unchanged) */
  summaryCountKeys?: Array<"discover" | "enrich" | "verify" | "qualify" | "operate">;
  auditStyle?: boolean;
};

export const DISCOVERY_FLOW_STAGES: DiscoveryFlowStageDef[] = [
  {
    id: "inputs",
    order: 1,
    label: "Inputs",
    description: "Source intake, directories, hashtags, seeds, and imports.",
    primaryHref: "/admin/studios/source-ingest",
    summaryCountKeys: ["discover"],
    tools: [
      { id: "source_ingest", navId: "source_ingest", label: "Source URL", href: "/admin/studios/source-ingest" },
      { id: "harvest", navId: "harvest", label: "Hashtag Harvest", href: "/admin/studios/creator-lab/hashtag-harvest" },
      { id: "ggen_discovery", navId: "ggen_discovery", label: "GG Seed", href: "/admin/studios/ggen-discovery" },
      { id: "backoffice", navId: "backoffice", label: "Back Office Import", href: "/admin/intelligence/salon/backoffice" },
    ],
  },
  {
    id: "resolve",
    order: 2,
    label: "Resolve",
    description: "Public presence, IG backfill, resolver, and enrichment signals.",
    primaryHref: "/admin/studios/public-presence",
    summaryCountKeys: ["enrich"],
    tools: [
      { id: "public_presence", navId: "public_presence", label: "Public Presence", href: "/admin/studios/public-presence" },
      { id: "resolver", navId: "resolver", label: "IG Resolver", href: "/admin/studios/creator-lab/ig-stubs" },
      { id: "business_stack", navId: "business_stack", label: "Business Stack", href: "/admin/studios/business-stack" },
      { id: "google_identity", navId: "google_identity", label: "Google Identity", href: "/admin/studios/google-identity" },
      { id: "harvest_analytics", navId: "harvest_analytics", label: "Harvest Analytics", href: "/admin/studios/harvest-analytics" },
    ],
  },
  {
    id: "qualify",
    order: 3,
    label: "Qualify",
    description: "Provenance, audits, import candidates, and qualified operators.",
    primaryHref: "/admin/studios/qualified-operators",
    summaryCountKeys: ["verify", "qualify"],
    tools: [
      { id: "provider_provenance", navId: "provider_provenance", label: "Provider Provenance", href: "/admin/studios/provider-provenance" },
      { id: "provider_audit", navId: "provider_audit", label: "Provider Audit", href: "/admin/studios/provider-audit" },
      { id: "import_candidates", navId: "import_candidates", label: "Import Candidates", href: "/admin/studios/import-candidates" },
      { id: "qualified_operators", navId: "qualified_operators", label: "Qualified Operators", href: "/admin/studios/qualified-operators" },
    ],
  },
  {
    id: "operate",
    order: 4,
    label: "Operate",
    description: "Prospects, assembly, and outreach-ready operations.",
    primaryHref: "/admin/studios/prospects",
    summaryCountKeys: ["operate"],
    tools: [
      { id: "prospects", navId: "prospects", label: "Prospects", href: "/admin/studios/prospects" },
      { id: "assembler", navId: "assembler", label: "Studio Assembler", href: "/admin/studios/creator-lab" },
      { id: "concierge_inbox", label: "Concierge Inbox", href: "/studios/inbox", external: true },
    ],
  },
  {
    id: "runs",
    order: 5,
    label: "Runs",
    description: "Run history, logs, audit trail, and re-run controls.",
    primaryHref: "/admin/studios/runs",
    auditStyle: true,
    tools: [
      { id: "runs", navId: "runs", label: "Run History", href: "/admin/studios/runs" },
    ],
  },
];

const PATH_TO_STAGE = new Map<string, DiscoveryFlowStageId>();
const NAV_ID_TO_STAGE = new Map<string, DiscoveryFlowStageId>();
const PATH_TO_TOOL = new Map<string, DiscoveryFlowTool>();

for (const stage of DISCOVERY_FLOW_STAGES) {
  PATH_TO_STAGE.set(stage.primaryHref, stage.id);
  for (const tool of stage.tools) {
    PATH_TO_STAGE.set(tool.href, stage.id);
    PATH_TO_TOOL.set(tool.href, tool);
    if (tool.navId) NAV_ID_TO_STAGE.set(tool.navId, stage.id);
  }
}

/** Longest-prefix match for discovery routes */
export function discoveryFlowStageForPathname(pathname: string): DiscoveryFlowStageId {
  if (pathname === "/admin/studios" || pathname.startsWith("/admin/studios?")) {
    return "inputs";
  }

  const salonPaths = [...salonConfig.navItems]
    .map((item) => ({ href: item.href, navId: item.id }))
    .sort((a, b) => b.href.length - a.href.length);

  for (const { href, navId } of salonPaths) {
    if (pathname === href || pathname.startsWith(`${href}/`)) {
      const byNav = NAV_ID_TO_STAGE.get(navId);
      if (byNav) return byNav;
    }
  }

  const allTools = DISCOVERY_FLOW_STAGES.flatMap((s) => s.tools)
    .sort((a, b) => b.href.length - a.href.length);

  for (const tool of allTools) {
    if (pathname === tool.href || pathname.startsWith(`${tool.href}/`)) {
      return PATH_TO_STAGE.get(tool.href) ?? "inputs";
    }
  }

  if (pathname.startsWith("/admin/studios/")) return "inputs";
  return "inputs";
}

export function discoveryFlowStageDef(id: DiscoveryFlowStageId): DiscoveryFlowStageDef {
  const def = DISCOVERY_FLOW_STAGES.find((s) => s.id === id);
  if (!def) throw new Error(`Unknown discovery flow stage: ${id}`);
  return def;
}

export function discoveryFlowStageForNavId(navId: string): DiscoveryFlowStageId | null {
  return NAV_ID_TO_STAGE.get(navId) ?? null;
}

export function discoveryFlowToolForPathname(pathname: string): DiscoveryFlowTool | null {
  const sorted = DISCOVERY_FLOW_STAGES.flatMap((s) => s.tools)
    .sort((a, b) => b.href.length - a.href.length);

  for (const tool of sorted) {
    if (pathname === tool.href || pathname.startsWith(`${tool.href}/`)) {
      return tool;
    }
  }
  return null;
}

export function discoveryFlowCountForStage(
  stage: DiscoveryFlowStageDef,
  counts: Partial<Record<"discover" | "enrich" | "verify" | "qualify" | "operate", number>> | null,
): number | null {
  if (!stage.summaryCountKeys?.length) return null;
  if (!counts) return 0;
  return stage.summaryCountKeys.reduce((sum, key) => sum + (counts[key] ?? 0), 0);
}
