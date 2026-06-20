/**
 * npm run test:vmb:invite-art
 */
import {
  countInviteArtByCategory,
  getInviteArtImage,
  inviteArtLibrary,
  resolveInviteArtCategory,
  validateInviteArtLibrary,
} from "../lib/vmb/assets";
import type { InviteArtCategory } from "../lib/vmb/assets/invite-art-types";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

const requiredMinimums: Record<InviteArtCategory, number> = {
  referral_invite: 6,
  birthday_card: 6,
  open_slot_fill: 5,
  pcn_invite: 5,
  refresh_card: 5,
  reactivation_card: 5,
  vip_thank_you: 5,
  first_visit: 5,
  generic_invite: 5,
};

function run(): void {
  const counts = countInviteArtByCategory();
  for (const [category, minimum] of Object.entries(requiredMinimums)) {
    assert((counts[category as InviteArtCategory] ?? 0) >= minimum, `${category} has at least ${minimum} assets`);
  }

  for (const asset of inviteArtLibrary.filter((row) => row.active)) {
    assert(!!asset.imageUrl.trim(), `${asset.id} has imageUrl`);
    assert(asset.tags.length > 0, `${asset.id} has tags`);
  }

  const guardrailViolations = validateInviteArtLibrary(inviteArtLibrary);
  if (guardrailViolations.length > 0) {
    for (const violation of guardrailViolations) {
      console.error(`FAIL: ${violation.assetId} (${violation.category}) ${violation.rule}: ${violation.detail}`);
    }
    process.exit(1);
  }

  assert(resolveInviteArtCategory("referral_invite") === "referral_invite", "referral maps correctly");
  assert(resolveInviteArtCategory("birthday_celebration") === "birthday_card", "birthday maps correctly");
  assert(resolveInviteArtCategory("open_chair") === "open_slot_fill", "open chair maps correctly");
  assert(resolveInviteArtCategory("private_client_network") === "pcn_invite", "PCN maps correctly");
  assert(resolveInviteArtCategory("we_miss_you") === "reactivation_card", "reactivation maps correctly");
  assert(resolveInviteArtCategory("first_visit_thank_you") === "first_visit", "first visit maps correctly");

  const day = new Date("2026-06-20T12:00:00.000Z");
  const first = getInviteArtImage({
    templateType: "birthday_celebration",
    salonId: "salon-a",
    inviteId: "invite-1",
    date: day,
  });
  const second = getInviteArtImage({
    templateType: "birthday_celebration",
    salonId: "salon-a",
    inviteId: "invite-1",
    date: day,
  });
  assert(first.imageUrl === second.imageUrl, "invite art is deterministic for same seed");
  assert(first.category === "birthday_card", "birthday resolves to birthday art");

  const locked = getInviteArtImage({ lockedInviteArtAssetId: "vip-thank-you-001" });
  assert(locked.source === "locked_invite_art", "locked invite art wins priority");
  assert(locked.assetId === "vip-thank-you-001", "locked invite art id preserved");

  const selected = getInviteArtImage({ selectedInviteArtUrl: "https://example.com/invite-art.jpg" });
  assert(selected.source === "selected_invite_art", "selected URL wins before rotation");
  assert(selected.imageUrl === "https://example.com/invite-art.jpg", "selected URL returned");

  console.log("OK: invite art library guardrails and resolver passed");
}

run();
