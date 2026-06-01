// lib/intelligence/salon/harvest-analytics.ts
// Aggregate hashtag harvest coverage and provider discovery metrics.

import { listHarvestRuns } from "@/lib/studios/creator-lab/hashtag-harvest/store";
import { filterProspects } from "@/lib/studios/prospects/store";
import { analyzeProspectProviderDetection } from "./provider-detection-diagnostics";
import { isSalonImportCandidate } from "./import-candidate";
import type { HashtagHarvestHashtagStats, HashtagHarvestRun } from "@/lib/studios/creator-lab/hashtag-harvest/types";

export type HarvestAnalyticsTotals = {
  totalHarvestRuns: number;
  totalHashtags: number;
  totalPostsPulled: number;
  totalCreatorsFound: number;
  totalDedupedProspects: number;
  providersDetected: number;
  glossGeniusTotal: number;
  vagaroTotal: number;
  ggHandleMatches: number;
  ggDisplayMatches: number;
  ggDirect: number;
  ggLinkInBio: number;
  importCandidates: number;
  providerCoveragePct: number;
  ggCandidatesTested: number;
  ggConfirmedClientPages: number;
  ggGenericHomepage: number;
  ggNotFound: number;
  ggTimeouts: number;
};

export type HarvestAnalyticsHashtagRow = HashtagHarvestHashtagStats & {
  ggDirect?: number | "not_tracked_yet";
  ggLinkInBio?: number | "not_tracked_yet";
  ggHandleMatch?: number | "not_tracked_yet";
  ggDisplayMatch?: number | "not_tracked_yet";
  vagaro?: number | "not_tracked_yet";
  lastRun?: string | null;
};

export type HarvestAnalyticsPayload = {
  totals: HarvestAnalyticsTotals;
  perHashtag: HarvestAnalyticsHashtagRow[];
  recentRuns: HashtagHarvestRun[];
};

function uniqueHashtags(runs: { hashtags: string[] }[]): number {
  const set = new Set<string>();
  for (const r of runs) {
    for (const h of r.hashtags) set.add(h);
  }
  return set.size;
}

export async function buildHarvestAnalytics(): Promise<HarvestAnalyticsPayload> {
  const runs = await listHarvestRuns();
  const salonProspects = await filterProspects({ vertical: "salon" });

  let providersDetected = 0;
  let glossGeniusTotal = 0;
  let vagaroTotal = 0;
  let ggHandleMatches = 0;
  let ggDisplayMatches = 0;
  let ggDirect = 0;
  let ggLinkInBio = 0;
  let importCandidates = 0;
  let ggCandidatesTested = 0;
  let ggConfirmedClientPages = 0;
  let ggGenericHomepage = 0;
  let ggNotFound = 0;
  let ggTimeouts = 0;

  for (const p of salonProspects) {
    const d = analyzeProspectProviderDetection(p);
    const candidateCount = p.ggCandidateUrls?.length ?? p.ggCheckedUrls?.length ?? 0;
    if (candidateCount > 0) ggCandidatesTested += candidateCount;
    if (p.ggValidationStatus === "confirmed_client_page") ggConfirmedClientPages++;
    else if (
      p.ggValidationStatus === "generic_glossgenius_page" ||
      p.ggValidationStatus === "redirect_home"
    ) {
      ggGenericHomepage++;
    } else if (p.ggValidationStatus === "not_found") ggNotFound++;
    else if (p.ggValidationStatus === "timeout") ggTimeouts++;

    if (d.outcome === "detected") {
      providersDetected++;
      if (d.provider === "glossgenius") glossGeniusTotal++;
      if (d.provider === "vagaro") vagaroTotal++;
      if (d.glossGeniusStatus === "gg_direct") ggDirect++;
      if (d.glossGeniusStatus === "gg_link_in_bio") ggLinkInBio++;
      if (d.glossGeniusStatus === "gg_handle_match") ggHandleMatches++;
      if (d.glossGeniusStatus === "gg_display_match") ggDisplayMatches++;
    }
    if (isSalonImportCandidate(p)) importCandidates++;
  }

  const totalDeduped = runs.reduce((n, f) => n + (f.run.totalCreators ?? 0), 0);
  const totalPosts = runs.reduce((n, f) => n + (f.run.totalPosts ?? 0), 0);
  const creatorsFound = runs.reduce((n, f) => {
    const t = f.run.hashtagStatsTotals?.creatorsFound;
    return n + (t ?? f.run.totalCreators ?? 0);
  }, 0);

  const providerCoveragePct =
    totalDeduped > 0 ? Math.round((providersDetected / salonProspects.length) * 1000) / 10 : 0;

  const hashtagLastRun = new Map<string, string>();
  for (const f of runs) {
    for (const h of f.run.hashtags) {
      const prev = hashtagLastRun.get(h);
      if (!prev || f.run.createdAt > prev) hashtagLastRun.set(h, f.run.createdAt);
    }
  }

  const perHashtagMap = new Map<string, HarvestAnalyticsHashtagRow>();
  for (const f of runs) {
    for (const row of f.run.hashtagStats ?? []) {
      const existing = perHashtagMap.get(row.hashtag);
      if (!existing || (hashtagLastRun.get(row.hashtag) ?? "") === f.run.createdAt) {
        perHashtagMap.set(row.hashtag, {
          ...row,
          ggDirect: "not_tracked_yet",
          ggLinkInBio: "not_tracked_yet",
          ggHandleMatch: "not_tracked_yet",
          ggDisplayMatch: "not_tracked_yet",
          vagaro: "not_tracked_yet",
          lastRun: hashtagLastRun.get(row.hashtag) ?? f.run.createdAt,
        });
      } else if (existing) {
        existing.postsPulled += row.postsPulled;
        existing.creatorsFound += row.creatorsFound;
        existing.creatorsDeduped += row.creatorsDeduped;
        existing.bookingProvidersFound += row.bookingProvidersFound;
        existing.finalProspects += row.finalProspects;
      }
    }
  }

  const totals: HarvestAnalyticsTotals = {
    totalHarvestRuns: runs.length,
    totalHashtags: uniqueHashtags(runs.map((f) => f.run)),
    totalPostsPulled: totalPosts,
    totalCreatorsFound: creatorsFound,
    totalDedupedProspects: totalDeduped,
    providersDetected,
    glossGeniusTotal,
    vagaroTotal,
    ggHandleMatches,
    ggDisplayMatches,
    ggDirect,
    ggLinkInBio,
    importCandidates,
    providerCoveragePct: salonProspects.length
      ? Math.round((providersDetected / salonProspects.length) * 1000) / 10
      : 0,
    ggCandidatesTested,
    ggConfirmedClientPages,
    ggGenericHomepage,
    ggNotFound,
    ggTimeouts,
  };

  return {
    totals,
    perHashtag: Array.from(perHashtagMap.values()).sort((a, b) =>
      (b.lastRun ?? "").localeCompare(a.lastRun ?? ""),
    ),
    recentRuns: runs.slice(0, 20).map((f) => f.run),
  };
}
