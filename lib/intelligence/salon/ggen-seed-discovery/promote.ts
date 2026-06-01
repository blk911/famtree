// lib/intelligence/salon/ggen-seed-discovery/promote.ts

import { upsertProspect } from "@/lib/studios/prospects/store";
import { normalizeHandle } from "@/lib/studios/prospects/store-json";
import { businessNameToHandleHint } from "./parse";
import type { GgenSeedDiscoveryResult } from "./types";

export type PromoteGgenResult = {
  resultId: string;
  prospectId: string | null;
  action: "created" | "updated" | "skipped";
  reason?: string;
};

export async function promoteGgenDiscoveryResult(
  result: GgenSeedDiscoveryResult,
  runId: string,
): Promise<PromoteGgenResult> {
  if (!result.found || !result.bookingUrl || result.bookingProvider !== "glossgenius") {
    return { resultId: result.id, prospectId: null, action: "skipped", reason: "not_found" };
  }

  const handleBase = businessNameToHandleHint(result.businessName);
  const handle = `@${normalizeHandle(handleBase).slice(0, 30) || "salon"}`;

  const tags = ["backoffice_import_candidate", "ggen_seed_discovery"];

  const record = await upsertProspect({
    source: {
      sourceType: "ggen_seed_discovery",
      batchId: runId,
      sourceHandle: handle,
      sourceDisplayName: result.businessName,
    },
    vertical: "salon",
    sourcePlatform: "glossgenius",
    sourceTool: "ggen_discovery",
    sourceHashtag: null,
    sourceHashtags: [],
    sourcePath: `salon/ggen-discovery/${runId}`,
    runId,
    harvestDate: new Date().toISOString().slice(0, 10),
    identity: {
      name: result.businessName,
      handle,
      categoryGuess: result.category,
      locationGuess: [result.city, result.state].filter(Boolean).join(", ") || null,
    },
    platforms: ["glossgenius"],
    bestMatch: {
      platform: "glossgenius",
      url: result.bookingUrl,
      confidence: result.confidence,
      matchReason: `ggen seed discovery (${result.discoverySource})`,
    },
    allMatchedUrls: [
      {
        platform: "glossgenius",
        url: result.bookingUrl,
        confidence: result.confidence,
        matchReason: result.discoverySource ?? "seed",
      },
    ],
    evidence: result.evidence,
    bookingProvider: "glossgenius",
    bookingProviderLabel: "GlossGenius",
    bookingUrl: result.bookingUrl,
    bookingProviderConfidence: result.confidence,
    bookingProviderEvidence: result.evidence,
    bookingProviderSource:
      result.discoverySource === "seed_search" ? "direct_url" : "handle_derived",
    offerFitTags: Array.from(new Set(tags)),
    suggestedValidationStatus: "new",
    educationType: null,
    audienceType: null,
    sourceTopic: null,
    services: [],
    confidence: {
      identityMatch: 0,
      bookingMatch: result.confidence,
      categoryMatch: 0,
      locationMatch: 0,
      overall: result.confidence,
    },
  });

  const action =
    record.createdAt === record.updatedAt ? "created" : "updated";

  return {
    resultId: result.id,
    prospectId: record.prospectId,
    action,
  };
}

export async function promoteGgenDiscoveryResults(
  results: GgenSeedDiscoveryResult[],
  runId: string,
  resultIds?: string[],
): Promise<PromoteGgenResult[]> {
  const idSet = resultIds ? new Set(resultIds) : null;
  const toPromote = results.filter((r) => {
    if (!r.importCandidate && !r.found) return false;
    if (idSet && !idSet.has(r.id)) return false;
    return r.found && r.bookingUrl;
  });

  const out: PromoteGgenResult[] = [];
  for (const r of toPromote) {
    out.push(await promoteGgenDiscoveryResult(r, runId));
  }
  return out;
}
