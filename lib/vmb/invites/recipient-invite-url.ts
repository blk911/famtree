export function buildRecipientInvitePath(inviteId: string): string {
  const trimmed = inviteId.trim();
  return `/vmb/invite/${encodeURIComponent(trimmed)}`;
}

export function buildRecipientInviteClaimPath(inviteId: string): string {
  return `${buildRecipientInvitePath(inviteId)}/claim`;
}

/** Absolute URL when origin is known (e.g. admin copy field). */
export function buildRecipientInviteUrl(inviteId: string, origin?: string): string {
  const path = buildRecipientInvitePath(inviteId);
  if (!origin?.trim()) return path;
  return `${origin.replace(/\/$/, "")}${path}`;
}
