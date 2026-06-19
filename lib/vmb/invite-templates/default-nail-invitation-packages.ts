import type { VmbDefaultInvitationPackage, VmbInviteType } from "./invite-template-types";

/** Canonical nail service ids — matches builder / catalog. */
export const NAIL_PKG_GEL_MANICURE = "default-nails-gel-manicure";
export const NAIL_PKG_BUILDER_GEL = "default-nails-builder-gel";
export const NAIL_PKG_STRUCTURED_GEL = "default-nails-structured-gel";
export const NAIL_PKG_GEL_X = "default-nails-gel-x";
export const NAIL_PKG_FILL_REFRESH = "default-nails-fill-refresh";

/** Canonical add-on / perk ids — matches OfferNailSelectionFields. */
export const NAIL_PKG_ADDON_CHROME = "addon-chrome";
export const NAIL_PKG_ADDON_FRENCH = "addon-french";
export const NAIL_PKG_ADDON_CRYSTALS = "addon-crystals";
export const NAIL_PKG_PERK_PRIORITY = "offer-perk-priority-booking";
export const NAIL_PKG_PERK_REPAIR = "offer-perk-complimentary-repair";
export const NAIL_PKG_PERK_REMOVAL = "offer-perk-removal-credit";

function pkg(
  serviceIds: string[],
  serviceOptionIds: string[],
  expirationLabel: string,
  extras?: Pick<VmbDefaultInvitationPackage, "priceLabel" | "termsText">,
): VmbDefaultInvitationPackage {
  return {
    serviceIds,
    serviceOptionIds,
    expirationLabel,
    ...extras,
  };
}

/**
 * Admin Default invitation packages — one per nail invite type.
 * Future: Salon Override → TAIKOS Personalization.
 */
export const DEFAULT_NAIL_INVITATION_PACKAGES: Record<VmbInviteType, VmbDefaultInvitationPackage> = {
  private_client_network: pkg(
    [NAIL_PKG_BUILDER_GEL],
    [NAIL_PKG_PERK_PRIORITY],
    "Valid for 30 days",
    { termsText: "Private network access is non-transferable." },
  ),
  birthday_celebration: pkg(
    [NAIL_PKG_GEL_X],
    [NAIL_PKG_ADDON_CHROME],
    "Valid through birthday month",
    { priceLabel: "Birthday treat included" },
  ),
  referral_invite: pkg(
    [NAIL_PKG_GEL_MANICURE],
    [NAIL_PKG_PERK_REPAIR],
    "Valid for 14 days",
  ),
  open_chair: pkg(
    [NAIL_PKG_FILL_REFRESH],
    [NAIL_PKG_PERK_PRIORITY],
    "Expires in 48 hours",
  ),
  refresh_reminder: pkg(
    [NAIL_PKG_FILL_REFRESH],
    [NAIL_PKG_ADDON_FRENCH],
    "Valid for 14 days",
  ),
  we_miss_you: pkg(
    [NAIL_PKG_GEL_MANICURE],
    [NAIL_PKG_ADDON_CHROME],
    "Valid for 30 days",
    { priceLabel: "Welcome-back offer" },
  ),
  vip_thank_you: pkg(
    [NAIL_PKG_STRUCTURED_GEL],
    [NAIL_PKG_ADDON_CRYSTALS, NAIL_PKG_PERK_PRIORITY],
    "Valid for 60 days",
    { priceLabel: "VIP appreciation included" },
  ),
  favorite_providers: pkg([NAIL_PKG_BUILDER_GEL], [], "Valid for 30 days"),
  first_visit_thank_you: pkg(
    [NAIL_PKG_GEL_MANICURE],
    [NAIL_PKG_ADDON_FRENCH],
    "Valid for 30 days",
  ),
  new_client_welcome: pkg(
    [NAIL_PKG_GEL_MANICURE],
    [NAIL_PKG_PERK_REMOVAL],
    "Valid for 30 days",
    { priceLabel: "First-visit welcome" },
  ),
};

export function getDefaultNailInvitationPackage(
  inviteType: VmbInviteType,
): VmbDefaultInvitationPackage {
  return {
    ...DEFAULT_NAIL_INVITATION_PACKAGES[inviteType],
    serviceIds: [...DEFAULT_NAIL_INVITATION_PACKAGES[inviteType].serviceIds],
    serviceOptionIds: [...DEFAULT_NAIL_INVITATION_PACKAGES[inviteType].serviceOptionIds],
  };
}
