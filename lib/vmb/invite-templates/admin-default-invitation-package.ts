import { buildDraftInviteSnapshot, buildNailTemplateDraft } from "@/lib/vmb/admin/nail-template-library";
import { getDefaultNailInviteTemplate } from "@/lib/vmb/invite-templates/default-nail-invite-templates";
import {
  resolveNailOfferAddonLabels,
  resolveNailOfferServiceLabels,
} from "@/lib/vmb/admin/nail-offer-builder-selections";
import type { InviteTemplateSnapshot } from "@/lib/vmb/invites/invite-template-snapshot";
import type { VmbDefaultInvitationPackage } from "@/lib/vmb/invite-templates/invite-template-types";
import { getDefaultNailInvitationPackage } from "@/lib/vmb/invite-templates/default-nail-invitation-packages";

export type AdminDefaultPackageLabels = {
  services: string[];
  rewards: string[];
  expirationLabel?: string;
  priceLabel?: string;
};

export function resolveAdminDefaultInvitationPackage(
  templateId: string,
): VmbDefaultInvitationPackage | undefined {
  const template = getDefaultNailInviteTemplate(templateId);
  return template?.defaultPackage;
}

export function resolveAdminDefaultPackageLabels(
  templateId: string,
  fallback?: {
    serviceFallbackById?: Record<string, string | undefined>;
    rewardFallbackById?: Record<string, string | undefined>;
  },
): AdminDefaultPackageLabels {
  const pkg = resolveAdminDefaultInvitationPackage(templateId);
  if (!pkg) {
    return { services: [], rewards: [] };
  }
  return {
    services: resolveNailOfferServiceLabels(pkg.serviceIds, fallback?.serviceFallbackById),
    rewards: resolveNailOfferAddonLabels(pkg.serviceOptionIds, fallback?.rewardFallbackById),
    expirationLabel: pkg.expirationLabel,
    priceLabel: pkg.priceLabel,
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
  return buildDraftInviteSnapshot(draft, {
    ownerName: options.ownerName,
    salonName: options.salonName,
    ownerPhotoUrl: options.ownerPhotoUrl,
    salonLogoUrl: options.salonLogoUrl,
    serviceImageUrl: options.serviceImageUrl,
    expirationLabel: template.defaultPackage.expirationLabel,
    priceLabel: template.defaultPackage.priceLabel,
    termsText: template.defaultPackage.termsText,
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
