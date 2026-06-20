import { buildDraftInviteSnapshot, buildNailTemplateDraft } from "@/lib/vmb/admin/nail-template-library";

import { getDefaultNailInviteTemplate } from "@/lib/vmb/invite-templates/default-nail-invite-templates";

import {

  resolveNailOfferAddonLabels,

  resolveNailOfferServiceLabels,

} from "@/lib/vmb/admin/nail-offer-builder-selections";

import type { InviteTemplateSnapshot } from "@/lib/vmb/invites/invite-template-snapshot";

import type { VmbDefaultInvitationPackage } from "@/lib/vmb/invite-templates/invite-template-types";

import { getDefaultNailInvitationPackage } from "@/lib/vmb/invite-templates/default-nail-invitation-packages";

import {

  applyPricingToSnapshotFields,

  calculateInvitationPackagePricing,

  type InvitationPackagePricing,

} from "@/lib/vmb/invites/invitation-package-pricing";



export type AdminDefaultPackageLabels = {

  services: string[];

  rewards: string[];

  expirationLabel?: string;

  priceLabel?: string;

  pricing?: InvitationPackagePricing;

};



export type ResolvedAdminDefaultInvitationPackage = VmbDefaultInvitationPackage & {

  pricing: InvitationPackagePricing;

};



export function resolveAdminDefaultInvitationPackage(

  templateId: string,

): VmbDefaultInvitationPackage | undefined {

  const template = getDefaultNailInviteTemplate(templateId);

  return template?.defaultPackage;

}



export function resolveAdminDefaultInvitationPackageWithPricing(

  templateId: string,

): ResolvedAdminDefaultInvitationPackage | undefined {

  const template = getDefaultNailInviteTemplate(templateId);

  if (!template) return undefined;

  const pkg = template.defaultPackage;

  const pricing = calculateInvitationPackagePricing({

    serviceIds: pkg.serviceIds,

    serviceOptionIds: pkg.serviceOptionIds,

    inviteType: template.inviteType,

  });

  return { ...pkg, pricing };

}



export function resolveAdminDefaultPackageLabels(

  templateId: string,

  fallback?: {

    serviceFallbackById?: Record<string, string | undefined>;

    rewardFallbackById?: Record<string, string | undefined>;

  },

): AdminDefaultPackageLabels {

  const resolved = resolveAdminDefaultInvitationPackageWithPricing(templateId);

  if (!resolved) {

    return { services: [], rewards: [] };

  }

  return {

    services: resolveNailOfferServiceLabels(resolved.serviceIds, fallback?.serviceFallbackById),

    rewards: resolveNailOfferAddonLabels(resolved.serviceOptionIds, fallback?.rewardFallbackById),

    expirationLabel: resolved.expirationLabel,

    priceLabel: resolved.pricing.priceLabel,

    pricing: resolved.pricing,

  };

}



export function buildAdminDefaultSnapshotFromTemplate(

  templateId: string,

  options: {

    ownerName?: string;

    salonName?: string;

    ownerPhotoUrl?: string;

    salonLogoUrl?: string;

    serviceImageUrl?: string;

  } = {},

): InviteTemplateSnapshot | null {

  const template = getDefaultNailInviteTemplate(templateId);

  if (!template) return null;

  const draft = buildNailTemplateDraft(template, undefined);

  const pricing = calculateInvitationPackagePricing({

    serviceIds: template.defaultPackage.serviceIds,

    serviceOptionIds: template.defaultPackage.serviceOptionIds,

    inviteType: template.inviteType,

  });

  const pricingFields = applyPricingToSnapshotFields(pricing);

  return buildDraftInviteSnapshot(draft, {

    ownerName: options.ownerName,

    salonName: options.salonName,

    ownerPhotoUrl: options.ownerPhotoUrl,

    salonLogoUrl: options.salonLogoUrl,

    serviceImageUrl: options.serviceImageUrl,

    expirationLabel: template.defaultPackage.expirationLabel,

    termsText: template.defaultPackage.termsText,

    ...pricingFields,

  });

}



export function validateDefaultInvitationPackage(

  pkg: VmbDefaultInvitationPackage | undefined,

): string | null {

  if (!pkg) return "defaultPackage is required";

  if (!Array.isArray(pkg.serviceIds) || pkg.serviceIds.length === 0) {

    return "defaultPackage.serviceIds must include at least one service";

  }

  if (!Array.isArray(pkg.serviceOptionIds)) {

    return "defaultPackage.serviceOptionIds must be an array";

  }

  if (!pkg.expirationLabel?.trim()) {

    return "defaultPackage.expirationLabel is required";

  }

  return null;

}



/** Re-export for tests — every invite type must have a package. */

export { getDefaultNailInvitationPackage };


