import type { InviteArtAsset, InviteArtCategory } from "./invite-art-types";

const CATEGORY_REQUIRED_TAGS: Record<InviteArtCategory, readonly string[]> = {
  referral_invite: ["referral", "gift", "friendship", "sharing"],
  birthday_card: ["birthday", "celebration", "flowers", "gift"],
  open_slot_fill: ["calendar", "appointment", "availability", "open-slot", "open-chair"],
  pcn_invite: ["private", "vip", "envelope", "invitation"],
  refresh_card: ["refresh", "maintenance", "fresh-look"],
  reactivation_card: ["reactivation", "welcome-back", "warm"],
  vip_thank_you: ["thank-you", "vip", "gratitude", "premium"],
  first_visit: ["first-visit", "welcome", "fresh-start"],
  generic_invite: ["generic", "invitation", "flowers", "salon"],
};

export type InviteArtGuardrailViolation = {
  assetId: string;
  category: InviteArtCategory;
  rule: string;
  detail: string;
};

function normalizedTags(asset: InviteArtAsset): Set<string> {
  return new Set(asset.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean));
}

export function validateInviteArtAsset(asset: InviteArtAsset): InviteArtGuardrailViolation[] {
  const violations: InviteArtGuardrailViolation[] = [];
  const tags = normalizedTags(asset);

  if (!asset.imageUrl.trim()) {
    violations.push({
      assetId: asset.id,
      category: asset.category,
      rule: "url",
      detail: "active asset must have imageUrl",
    });
  }

  const requiredTags = CATEGORY_REQUIRED_TAGS[asset.category];
  if (!requiredTags.some((tag) => tags.has(tag))) {
    violations.push({
      assetId: asset.id,
      category: asset.category,
      rule: "visual-lane",
      detail: `missing one of: ${requiredTags.join(", ")}`,
    });
  }

  return violations;
}

export function validateInviteArtLibrary(assets: readonly InviteArtAsset[]): InviteArtGuardrailViolation[] {
  return assets.filter((asset) => asset.active).flatMap(validateInviteArtAsset);
}
