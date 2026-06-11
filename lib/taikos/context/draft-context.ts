import type { TaikosDraftSummary } from "@/lib/taikos/drafts/types";
import type { AiosPageContext, AiosPageId } from "@/lib/taikos/types";

function inviteDraftCount(summary: TaikosDraftSummary): number {
  return (summary.draftsByType.pcn_invite ?? 0) + (summary.draftsByType.referral_ask ?? 0);
}

function campaignDraftCount(summary: TaikosDraftSummary): number {
  return (
    (summary.draftsByType.campaign ?? 0) +
    (summary.draftsByType.reactivation ?? 0) +
    (summary.draftsByType.calendar_gap ?? 0)
  );
}

export function enrichPageContextWithDrafts(
  page: AiosPageContext,
  summary: TaikosDraftSummary,
): AiosPageContext {
  const base = page.assistantIntro;
  let assistantIntro = base;

  if (summary.openDrafts === 0) {
    return page;
  }

  if (page.pageId === "invites") {
    const count = inviteDraftCount(summary);
    if (count > 0) {
      assistantIntro = `You have ${count} invite draft${count === 1 ? "" : "s"} ready to review.`;
    }
  } else if (page.pageId === "campaigns" || page.pageId === "history") {
    const count = campaignDraftCount(summary);
    if (count > 0) {
      assistantIntro = `You have ${count} campaign draft${count === 1 ? "" : "s"} saved.`;
    }
  } else if (page.pageId === "offers") {
    const count = summary.draftsByType.service_card ?? 0;
    if (count > 0) {
      assistantIntro = `You have ${count} service card draft${count === 1 ? "" : "s"} saved.`;
    }
  }

  return { ...page, assistantIntro };
}

export function draftBriefingLine(summary: TaikosDraftSummary): string | null {
  if (summary.openDrafts <= 0) return null;
  return `You have ${summary.openDrafts} saved draft${summary.openDrafts === 1 ? "" : "s"} ready for review.`;
}

export function pageIdForDraftWorkspace(workspace: "invites" | "campaigns" | "service-cards"): AiosPageId {
  if (workspace === "invites") return "invites";
  if (workspace === "service-cards") return "offers";
  return "campaigns";
}
