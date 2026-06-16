import { isOpenDraftStatus } from "@/lib/taikos/drafts/draft-status";
import type { TaikosDraftSummary, TaikosDraftType } from "@/lib/taikos/drafts/types";
import { buildVmbSalonHref } from "@/lib/vmb/salon-href";
import type { VmbInviteDraft } from "@/types/vmb/invite-draft";

const TAIKOS_INVITE_DRAFT_TYPES = new Set<TaikosDraftType>(["pcn_invite", "referral_ask"]);

export type UnifiedInviteDraftSource = "taikos" | "vmb" | null;

export type UnifiedInviteDraftSummary = {
  taikosDraftCount: number;
  vmbDraftCount: number;
  totalOpenDrafts: number;
  sentCount: number;
  nextDraftSource: UnifiedInviteDraftSource;
  canonicalActionHref: string;
};

export function isTaikosInviteDraftType(draftType: TaikosDraftType): boolean {
  return TAIKOS_INVITE_DRAFT_TYPES.has(draftType);
}

/** Open invite-type tAIkOS drafts (pcn_invite + referral_ask). */
export function countTaikosOpenInviteDrafts(summary: TaikosDraftSummary): number {
  return (summary.draftsByType.pcn_invite ?? 0) + (summary.draftsByType.referral_ask ?? 0);
}

/** VMB invite drafts awaiting review or send (draft + approved). */
export function countVmbOpenInviteDrafts(drafts: VmbInviteDraft[]): number {
  return drafts.filter((d) => d.status === "draft" || d.status === "approved").length;
}

export function countVmbSentInviteDrafts(drafts: VmbInviteDraft[]): number {
  return drafts.filter((d) => d.status === "sent").length;
}

/** Sent invite drafts from both stores (tAIkOS count is from recent draft list). */
export function countSentInviteDrafts(
  taikosSummary: TaikosDraftSummary,
  vmbDrafts: VmbInviteDraft[],
): number {
  const taikosSent = taikosSummary.recentDrafts.filter(
    (draft) => isTaikosInviteDraftType(draft.draftType) && draft.status === "sent",
  ).length;
  return countVmbSentInviteDrafts(vmbDrafts) + taikosSent;
}

export function resolveNextInviteDraftSource(
  taikosDraftCount: number,
  vmbDraftCount: number,
): UnifiedInviteDraftSource {
  if (vmbDraftCount > 0) return "vmb";
  if (taikosDraftCount > 0) return "taikos";
  return null;
}

export function buildUnifiedInviteDraftSummary(input: {
  taikosDraftSummary: TaikosDraftSummary;
  vmbInviteDrafts: VmbInviteDraft[];
  analysisId?: string;
}): UnifiedInviteDraftSummary {
  const taikosDraftCount = countTaikosOpenInviteDrafts(input.taikosDraftSummary);
  const vmbDraftCount = countVmbOpenInviteDrafts(input.vmbInviteDrafts);
  const totalOpenDrafts = taikosDraftCount + vmbDraftCount;
  const sentCount = countSentInviteDrafts(input.taikosDraftSummary, input.vmbInviteDrafts);
  const nextDraftSource = resolveNextInviteDraftSource(taikosDraftCount, vmbDraftCount);

  return {
    taikosDraftCount,
    vmbDraftCount,
    totalOpenDrafts,
    sentCount,
    nextDraftSource,
    canonicalActionHref: buildVmbSalonHref("/vmb/invites", input.analysisId),
  };
}

export function formatUnifiedInviteDraftDetail(summary: UnifiedInviteDraftSummary): string {
  if (summary.totalOpenDrafts === 0) {
    return "No invite drafts waiting for review.";
  }

  const parts: string[] = [];
  if (summary.vmbDraftCount > 0) {
    parts.push(
      `${summary.vmbDraftCount} VMB invite draft${summary.vmbDraftCount === 1 ? "" : "s"}`,
    );
  }
  if (summary.taikosDraftCount > 0) {
    parts.push(
      `${summary.taikosDraftCount} tAIkOS invite draft${summary.taikosDraftCount === 1 ? "" : "s"}`,
    );
  }

  const breakdown = parts.join(" · ");
  if (summary.totalOpenDrafts === 1) {
    return `${breakdown} ready for your approval.`;
  }
  return `${summary.totalOpenDrafts} open invite drafts (${breakdown}) ready for review.`;
}

/** Guard for callers that need to distinguish invite drafts from all tAIkOS open drafts. */
export function taikosOpenInviteDraftsFromRecent(summary: TaikosDraftSummary) {
  return summary.recentDrafts.filter(
    (draft) => isTaikosInviteDraftType(draft.draftType) && isOpenDraftStatus(draft.status),
  );
}
