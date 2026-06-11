import type { VmbInviteDraft } from "@/types/vmb/invite-draft";

export function humanizeInviteWhy(reason: string): string {
  if (reason.includes("VIP")) return "Trusted regular";
  if (reason.includes("visits")) return "Loyal repeat client";
  if (reason.includes("Recent")) return "Recently active";
  if (reason.includes("reconnect")) return "Ready to reconnect";
  return "Strong relationship fit";
}

export function inviteTierLabel(reason: string): string {
  if (reason.includes("VIP")) return "VIP Client";
  if (reason.includes("visits")) return "Repeat Client";
  return "Private Client";
}

export function parseVisitLabel(reason: string): string | null {
  const match = reason.match(/(\d+)\s+visits?/i);
  return match ? `${match[1]} visits` : null;
}

export type InviteQueueItem = {
  draftId: string;
  clientName: string;
  tier: string;
  visits: string | null;
  why: string;
  suggestedAction: string;
};

export function toInviteQueueItem(draft: VmbInviteDraft): InviteQueueItem {
  return {
    draftId: draft.draftId,
    clientName: draft.clientName,
    tier: inviteTierLabel(draft.reasonSelected),
    visits: parseVisitLabel(draft.reasonSelected),
    why: humanizeInviteWhy(draft.reasonSelected),
    suggestedAction: "Private Client Invite",
  };
}

export function clientBookStatus(trigger: string): string {
  const map: Record<string, string> = {
    VIP: "VIP",
    Lapsed: "Due for visit",
    Reactivation: "Win-back",
    Birthday: "Celebration",
    Referral: "Active",
    "Frequent Visitor": "Regular",
    "Trusted Intro": "Connected",
    "Event Client": "Event",
    "Bridal Client": "Bridal",
    "High Spend": "VIP",
  };
  return map[trigger] ?? "Active";
}

export function clientBookTags(row: {
  opportunityType: string;
  triggerType: string;
  secondaryBadges?: string[];
}): string[] {
  const tags = [clientBookStatus(row.triggerType)];
  if (row.opportunityType && !tags.includes(row.opportunityType)) {
    tags.push(row.opportunityType.replace("Trusted Intro", "Intro"));
  }
  return tags.slice(0, 3);
}
