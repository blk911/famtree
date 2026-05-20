import type {
  ActivityPostDTO,
  ApprovalRequestDTO,
  InviteDTO,
  TrustUnitDTO,
} from "@/types/aihsafe/dto";

export type GovernedEvent = {
  id: string;
  icon: string;
  label: string;
  time: string;
  sortAt: number;
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function buildGovernedEvents(input: {
  invites: InviteDTO[];
  pendingApprovals: ApprovalRequestDTO[];
  recentApprovals: ApprovalRequestDTO[];
  trustUnits: TrustUnitDTO[];
  activityPosts: ActivityPostDTO[];
}): GovernedEvent[] {
  const events: GovernedEvent[] = [];

  for (const inv of input.invites) {
    const pending = inv.status === "PENDING";
    events.push({
      id: `inv-${inv.id}`,
      icon: pending ? "📨" : "✓",
      label: pending
        ? `Invite sent to ${inv.recipientEmail}`
        : `Invite ${inv.status.toLowerCase()} — ${inv.recipientEmail}`,
      time: timeAgo(inv.createdAt),
      sortAt: new Date(inv.createdAt).getTime(),
    });
  }

  for (const ap of input.pendingApprovals) {
    events.push({
      id: `ap-pending-${ap.id}`,
      icon: "⏳",
      label: ap.contextSummary || `${ap.requestorName} needs approval`,
      time: timeAgo(ap.createdAt),
      sortAt: new Date(ap.createdAt).getTime(),
    });
  }

  for (const ap of input.recentApprovals) {
    events.push({
      id: `ap-done-${ap.id}`,
      icon: ap.state === "approved" ? "✓" : "·",
      label: `Approval ${ap.state} — ${ap.contextSummary || ap.requestorName}`,
      time: timeAgo(ap.resolvedAt ?? ap.createdAt),
      sortAt: new Date(ap.resolvedAt ?? ap.createdAt).getTime(),
    });
  }

  for (const tu of input.trustUnits) {
    if (tu.status === "dissolved") continue;
    events.push({
      id: `tu-${tu.id}`,
      icon: "🤝",
      label: `Trusted space created — ${tu.name ?? tu.vaultSpaceType.replace(/_/g, " ")}`,
      time: timeAgo(tu.createdAt),
      sortAt: new Date(tu.createdAt).getTime(),
    });
  }

  for (const post of input.activityPosts) {
    const pending =
      post.escalationState === "pending" || post.governanceState === "pending";
    events.push({
      id: `post-${post.id}`,
      icon: pending ? "📝" : "💬",
      label: pending
        ? `Post awaiting approval — ${post.authorName}`
        : `${post.authorName} in ${post.trustUnitName ?? "a trusted space"}`,
      time: timeAgo(post.createdAt),
      sortAt: new Date(post.createdAt).getTime(),
    });
  }

  return events.sort((a, b) => b.sortAt - a.sortAt).slice(0, 6);
}
