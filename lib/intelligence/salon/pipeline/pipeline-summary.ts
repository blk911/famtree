// lib/intelligence/salon/pipeline/pipeline-summary.ts
// Approximate pipeline stage counts from existing salon stores (navigation only).

import { filterProspects } from "@/lib/studios/prospects/store";
import type { ProspectRecord } from "@/lib/studios/prospects/types";
import { isSalonImportCandidate } from "@/lib/intelligence/salon/import-candidate";
import { listBusinessStacks } from "@/lib/intelligence/salon/business-stack/stack-store";
import { listPresenceResults } from "@/lib/intelligence/salon/public-presence/presence-store";
import { buildSalonGoogleIdentityReport } from "@/lib/intelligence/salon/google-identity/google-identity-engine";
import { buildSalonProviderProvenanceReport } from "@/lib/intelligence/salon/provider-provenance/provenance-engine";
import { listQualifiedOperators } from "@/lib/intelligence/salon/qualified-operator/list";
import type { SalonPipelineSummary, SalonPipelineStageId } from "./pipeline-types";

const DIRECTORY_SOURCE_TYPES = new Set([
  "vagaro_directory",
  "styleseat_directory",
  "glossgenius_directory",
  "suite_directory",
  "unknown_directory",
]);

function isDiscoverSource(p: ProspectRecord): boolean {
  const tags = p.offerFitTags ?? [];
  const tool = (p.sourceTool ?? "").toLowerCase();
  const sourceType = p.source?.sourceType ?? "";
  return (
    tool === "hashtag_harvest" ||
    tool === "salon_directory_ingest" ||
    tool === "ggen_discovery" ||
    tags.includes("salon_directory_ingest") ||
    tags.includes("ggen_seed_discovery") ||
    sourceType === "hashtag_harvest" ||
    sourceType === "ggen_seed_discovery" ||
    DIRECTORY_SOURCE_TYPES.has(sourceType) ||
    isSalonImportCandidate(p, undefined)
  );
}

function isEnriched(p: ProspectRecord, stackIds: Set<string>, presenceIds: Set<string>, googleIds: Set<string>): boolean {
  return (
    !!(p.bookingProvider || p.bookingUrl || p.ggValidationStatus) ||
    stackIds.has(p.prospectId) ||
    presenceIds.has(p.prospectId) ||
    googleIds.has(p.prospectId) ||
    (p.allMatchedUrls?.length ?? 0) > 0
  );
}

function isOperated(p: ProspectRecord): boolean {
  const vs = p.validationStatus ?? "new";
  if (vs !== "new") return true;
  const status = p.status ?? "new";
  return status !== "new" && status !== "styleseat_discovered";
}

export async function buildSalonPipelineSummary(): Promise<SalonPipelineSummary> {
  const prospects = await filterProspects({ vertical: "salon" });

  const stacks = await listBusinessStacks({ limit: 5000 });
  const stackIds = new Set(
    stacks.map((s) => s.prospectId).filter((id): id is string => !!id),
  );

  let presenceIds = new Set<string>();
  try {
    const presence = await listPresenceResults({ limit: 5000 });
    presenceIds = new Set(
      presence.map((r) => r.prospectId).filter((id): id is string => !!id),
    );
  } catch {
    presenceIds = new Set();
  }

  let googleIds = new Set<string>();
  try {
    const report = await buildSalonGoogleIdentityReport({ useCache: true });
    googleIds = new Set(
      (report.records ?? []).map((r) => r.prospectId).filter((id): id is string => !!id),
    );
  } catch {
    googleIds = new Set();
  }

  const discover = prospects.filter(isDiscoverSource).length;
  const enrich = prospects.filter((p) => isEnriched(p, stackIds, presenceIds, googleIds)).length;

  let verify = 0;
  try {
    const prov = await buildSalonProviderProvenanceReport({ useCache: true });
    verify = prov.summary.assignmentsWithProvenance ?? prov.records.length;
  } catch {
    verify = prospects.filter(
      (p) => p.bookingProvider && (p.bookingProviderConfidence ?? 0) >= 50,
    ).length;
  }

  const { operators: qualifiedOps } = await listQualifiedOperators({ limit: 5000 });
  const importIds = new Set(
    prospects.filter((p) => isSalonImportCandidate(p)).map((p) => p.prospectId),
  );
  const qualifiedIds = new Set(
    qualifiedOps
      .filter(
        (o) =>
          o.qualificationStatus === "qualified" ||
          o.qualificationStatus === "campaign_ready",
      )
      .map((o) => o.prospectId),
  );
  const qualifySet = new Set<string>();
  importIds.forEach((id) => qualifySet.add(id));
  qualifiedIds.forEach((id) => qualifySet.add(id));
  const qualify = qualifySet.size;

  const operate = prospects.filter(isOperated).length;

  const countNotes: Record<SalonPipelineStageId, string> = {
    discover:
      "Salon prospects from harvest, directory ingest, GG seed discovery, or import-candidate tags.",
    enrich:
      "Prospects with booking/stack/presence/Google identity signals (approximate overlap).",
    verify:
      "Provider assignments with explainable provenance (cache/report) or booking confidence fallback.",
    qualify:
      "Unique import candidates plus qualified / campaign-ready operators.",
    operate:
      "Prospects with human workflow status beyond raw new (reviewed, fit, contacted, etc.).",
  };

  return {
    discover,
    enrich,
    verify,
    qualify,
    operate,
    totalOperators: prospects.length,
    updatedAt: new Date().toISOString(),
    countNotes,
  };
}
