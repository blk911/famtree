import type { InviteDraftCategory } from "@/types/vmb/invite-draft";

export type InviteSectionId = InviteDraftCategory;

export const INVITE_SECTION_LABELS: Record<InviteDraftCategory, string> = {
  private_client_network: "Private Client Network",
  new_client_welcome: "New Client Welcome",
  revenue_touch: "First Visit Thank You",
  trusted_intro_request: "Referral Invite",
};

export const INVITE_SECTION_ORDER: InviteDraftCategory[] = [
  "private_client_network",
  "new_client_welcome",
  "revenue_touch",
  "trusted_intro_request",
];

export function parseInviteSection(raw: string | undefined): InviteSectionId | undefined {
  const v = raw?.trim() as InviteSectionId | undefined;
  if (v && v in INVITE_SECTION_LABELS) return v;
  return undefined;
}
