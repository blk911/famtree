// Human-readable summary of what an AihApprovalRequest is asking for.
// Generated server-side from contextJson so the UI never needs to parse raw JSON.

const KIND_FALLBACKS: Record<string, string> = {
  "invite.sent_child":       "Send an invite",
  "trust_unit.formed":       "Create a trusted space",
  "trust_unit.member_added": "Join a trusted space",
  "family_unit.created":     "Create a family group",
  "membership.granted":      "Join a space",
  "activity.post_pending":   "Post awaiting review",
};

export function buildContextSummary(actionKind: string, contextJson: unknown): string {
  const ctx =
    typeof contextJson === "object" && contextJson !== null
      ? (contextJson as Record<string, unknown>)
      : {};

  switch (actionKind) {
    case "invite.sent_child": {
      const email = typeof ctx.recipientEmail === "string" ? ctx.recipientEmail : "";
      const rel   = typeof ctx.relationship   === "string" ? ctx.relationship   : "";
      return email
        ? `Invite to ${email}${rel ? ` (${rel})` : ""}`
        : KIND_FALLBACKS[actionKind];
    }
    case "trust_unit.formed": {
      const name = typeof ctx.name === "string" ? ctx.name : "";
      return name ? `Create space "${name}"` : KIND_FALLBACKS[actionKind];
    }
    case "trust_unit.member_added": {
      const name =
        typeof ctx.spaceName   === "string" ? ctx.spaceName :
        typeof ctx.trustUnitId === "string" ? ctx.trustUnitId : "";
      return name ? `Join space "${name}"` : KIND_FALLBACKS[actionKind];
    }
    case "family_unit.created": {
      const name = typeof ctx.name === "string" ? ctx.name : "";
      return name ? `Create family group "${name}"` : KIND_FALLBACKS[actionKind];
    }
    case "activity.post_pending": {
      const spaceName = typeof ctx.spaceName === "string" && ctx.spaceName ? ctx.spaceName : "";
      const body      = typeof ctx.bodyText  === "string" ? ctx.bodyText.slice(0, 80)    : "";
      const ellipsis  = typeof ctx.bodyText  === "string" && ctx.bodyText.length > 80 ? "…" : "";
      if (spaceName && body) return `Post to "${spaceName}": ${body}${ellipsis}`;
      if (body)              return `Post awaiting review: ${body}${ellipsis}`;
      return KIND_FALLBACKS[actionKind];
    }

    default:
      return KIND_FALLBACKS[actionKind] ?? actionKind;
  }
}
