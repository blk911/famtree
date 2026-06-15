import type { TaikosDraftType } from "@/lib/taikos/drafts/types";

const INVITE_TRACKABLE_DRAFT_TYPES = new Set<TaikosDraftType>(["pcn_invite", "referral_ask"]);

export function isInviteTrackableDraftType(draftType: TaikosDraftType): boolean {
  return INVITE_TRACKABLE_DRAFT_TYPES.has(draftType);
}
