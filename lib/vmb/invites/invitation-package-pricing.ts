import {
  defaultNailAddonPrice,
  defaultNailServicePrice,
} from "@/lib/vmb/services/default-nail-pricing";
import { getDefaultNailInviteTemplate } from "@/lib/vmb/invite-templates/default-nail-invite-templates";
import type { VmbInviteType } from "@/lib/vmb/invite-templates/invite-template-types";

export type InvitationPackagePricing = {
  serviceTotal: number;
  addOnTotal: number;
  totalValue: number;
  savingsAmount: number;
  offerPrice: number;
  /** Offer price label — e.g. "$95" */
  priceLabel: string;
  /** Full package value label — e.g. "$110" */
  valueLabel: string;
};

/** Default savings by invite type (USD). Admin Default only. */
export const DEFAULT_INVITE_TYPE_SAVINGS: Record<VmbInviteType, number> = {
  birthday_celebration: 15,
  referral_invite: 10,
  refresh_reminder: 10,
  we_miss_you: 15,
  open_chair: 15,
  new_client_welcome: 10,
  vip_thank_you: 20,
  private_client_network: 0,
  favorite_providers: 0,
  first_visit_thank_you: 10,
};

export function formatInvitationPrice(amount: number): string {
  return `$${Math.max(0, Math.round(amount)).toLocaleString()}`;
}

export function calculateInvitationPackagePricing(input: {
  serviceIds: string[];
  serviceOptionIds: string[];
  savingsAmount?: number;
  offerPriceOverride?: number;
  inviteType?: VmbInviteType;
}): InvitationPackagePricing {
  const serviceTotal = input.serviceIds.reduce(
    (sum, id) => sum + defaultNailServicePrice(id),
    0,
  );
  const addOnTotal = input.serviceOptionIds.reduce(
    (sum, id) => sum + defaultNailAddonPrice(id),
    0,
  );
  const totalValue = serviceTotal + addOnTotal;
  const savingsAmount =
    input.savingsAmount ??
    (input.inviteType != null ? DEFAULT_INVITE_TYPE_SAVINGS[input.inviteType] : 0);
  const offerPrice =
    input.offerPriceOverride ?? Math.max(0, totalValue - savingsAmount);

  return {
    serviceTotal,
    addOnTotal,
    totalValue,
    savingsAmount,
    offerPrice,
    priceLabel: formatInvitationPrice(offerPrice),
    valueLabel: formatInvitationPrice(totalValue),
  };
}

export function applyPricingToSnapshotFields(
  pricing: InvitationPackagePricing,
): {
  totalValue: number;
  savingsAmount: number;
  offerPrice: number;
  valueLabel: string;
  priceLabel: string;
} {
  return {
    totalValue: pricing.totalValue,
    savingsAmount: pricing.savingsAmount,
    offerPrice: pricing.offerPrice,
    valueLabel: pricing.valueLabel,
    priceLabel: pricing.priceLabel,
  };
}

export function pricingFromSnapshotFields(snapshot: {
  serviceIds: string[];
  rewardIds: string[];
  sourceTemplateId: string;
  totalValue?: number;
  savingsAmount?: number;
  offerPrice?: number;
  valueLabel?: string;
  priceLabel?: string;
}): InvitationPackagePricing {
  if (
    snapshot.totalValue != null &&
    snapshot.offerPrice != null &&
    snapshot.savingsAmount != null &&
    snapshot.valueLabel &&
    snapshot.priceLabel
  ) {
    const serviceTotal = snapshot.serviceIds.reduce(
      (sum, id) => sum + defaultNailServicePrice(id),
      0,
    );
    const addOnTotal = snapshot.rewardIds.reduce(
      (sum, id) => sum + defaultNailAddonPrice(id),
      0,
    );
    return {
      serviceTotal,
      addOnTotal,
      totalValue: snapshot.totalValue,
      savingsAmount: snapshot.savingsAmount,
      offerPrice: snapshot.offerPrice,
      valueLabel: snapshot.valueLabel,
      priceLabel: snapshot.priceLabel,
    };
  }

  const inviteType = getDefaultNailInviteTemplate(snapshot.sourceTemplateId)?.inviteType;

  return calculateInvitationPackagePricing({
    serviceIds: snapshot.serviceIds,
    serviceOptionIds: snapshot.rewardIds,
    inviteType,
  });
}
