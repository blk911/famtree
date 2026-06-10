import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import {
  extractClientPool,
  scoreCandidate,
  recencyScore,
  spendScoreFromValue,
  type ClientPoolEntry,
} from "./client-pool";
import type { NetworkCandidate, NetworkLaunchSummary } from "./types";

export type NetworkInviteState = {
  invited: number;
  joined: number;
};

export function buildNetworkLaunchSummary(
  analysis: VmbBookAnalysisResult,
  inviteState: NetworkInviteState = { invited: 0, joined: 0 },
): NetworkLaunchSummary {
  const pool = extractClientPool(analysis);
  const scored = pool
    .map((entry) => toNetworkCandidate(entry))
    .sort((a, b) => b.candidateScore - a.candidateScore);

  const topCount = Math.max(1, Math.ceil(scored.length * 0.4));
  const topSlice = scored.slice(0, topCount);
  const readyThisWeek = Math.min(10, Math.max(0, topSlice.length - inviteState.invited));
  const remaining = Math.max(0, topSlice.length - inviteState.invited - inviteState.joined);

  return {
    topCandidates: topSlice.length,
    invited: inviteState.invited,
    joined: inviteState.joined,
    remaining,
    readyThisWeek,
    candidates: topSlice.slice(0, 10),
  };
}

function toNetworkCandidate(entry: ClientPoolEntry): NetworkCandidate {
  const spendPart = entry.spendScore || spendScoreFromValue(entry.spendScore * 25);
  const recencyPart = recencyScore(entry.daysInactive);
  return {
    clientName: entry.clientName,
    visitCount: entry.visitCount,
    recencyScore: recencyPart,
    spendScore: spendPart,
    candidateScore: entry.visitCount + recencyPart + spendPart,
  };
}
