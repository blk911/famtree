import { getDateSeed, getSeededIndex } from "./service-image-seed";
import { getServiceImage } from "./service-image-resolver";
import {
  getActiveInviteArtAssets,
  getFallbackInviteArtAsset,
  getInviteArtAssetById,
} from "./invite-art-library";
import type {
  InviteArtCategory,
  InviteArtImageInput,
  ResolvedInviteArtImage,
} from "./invite-art-types";

function normalizeType(input?: string): string {
  return input?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_") ?? "";
}

export function resolveInviteArtCategory(templateType?: string): InviteArtCategory {
  const normalized = normalizeType(templateType);
  if (/(referral_invite|referral_ask|refer_a_friend|referral)/.test(normalized)) return "referral_invite";
  if (/(birthday_card|birthday_celebration|birthday)/.test(normalized)) return "birthday_card";
  if (/(open_slot_fill|open_chair|open_slot|last_minute)/.test(normalized)) return "open_slot_fill";
  if (/(pcn_invite|private_client_network|private_client)/.test(normalized)) return "pcn_invite";
  if (/(refresh_card|fill_refresh|refresh)/.test(normalized)) return "refresh_card";
  if (/(first_visit_thank_you|first_visit|new_client_welcome|first_appointment|welcome)/.test(normalized)) return "first_visit";
  if (/(reactivation_card|we_miss_you|reactivation|winback)/.test(normalized)) return "reactivation_card";
  if (/(vip_thank_you|thank_you|vip)/.test(normalized)) return "vip_thank_you";
  return "generic_invite";
}

function categoryFromInput(input: InviteArtImageInput): InviteArtCategory {
  return resolveInviteArtCategory(input.templateType || input.invitationType || input.cardType);
}

function resolveTemplateKey(input: InviteArtImageInput): string {
  return input.inviteId?.trim() || input.templateType?.trim() || input.invitationType?.trim() || input.cardType?.trim() || "invite";
}

export function getInviteArtImage(input: InviteArtImageInput): ResolvedInviteArtImage {
  const lockedAsset = getInviteArtAssetById(input.lockedInviteArtAssetId);
  if (lockedAsset) {
    return {
      imageUrl: lockedAsset.imageUrl,
      title: lockedAsset.title,
      source: "locked_invite_art",
      assetId: lockedAsset.id,
      category: lockedAsset.category,
      photographer: lockedAsset.photographer,
      sourceName: lockedAsset.sourceName,
      sourceUrl: lockedAsset.sourceUrl,
    };
  }

  const selectedInviteArtUrl = input.selectedInviteArtUrl?.trim();
  if (selectedInviteArtUrl) {
    return {
      imageUrl: selectedInviteArtUrl,
      title: "Selected invitation artwork",
      source: "selected_invite_art",
    };
  }

  const category = categoryFromInput(input);
  const assets = getActiveInviteArtAssets(category);
  const fallback = getFallbackInviteArtAsset();
  const asset =
    assets.length > 0
      ? assets[
          getSeededIndex(
            [input.salonId, resolveTemplateKey(input), category, getDateSeed(input.date)],
            assets.length,
          )
        ]
      : fallback;

  if (asset) {
    return {
      imageUrl: asset.imageUrl,
      title: asset.title,
      source: asset.category === "generic_invite" && category !== "generic_invite" ? "generic_invite_fallback" : "rotating_invite_art",
      assetId: asset.id,
      category: asset.category,
      photographer: asset.photographer,
      sourceName: asset.sourceName,
      sourceUrl: asset.sourceUrl,
    };
  }

  const serviceFallback = getServiceImage({
    serviceName: input.serviceName,
    salonId: input.salonId,
    date: input.date,
  });

  return {
    imageUrl: serviceFallback.imageUrl,
    title: serviceFallback.title,
    source: "service_photo_fallback",
    assetId: serviceFallback.assetId,
  };
}
