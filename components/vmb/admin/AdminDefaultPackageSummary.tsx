"use client";

import {
  resolveNailOfferAddonLabels,
  resolveNailOfferServiceLabels,
} from "@/lib/vmb/admin/nail-offer-builder-selections";
import { resolveAdminDefaultInvitationPackageWithPricing } from "@/lib/vmb/invite-templates/admin-default-invitation-package";
import type { VmbDefaultInvitationPackage } from "@/lib/vmb/invite-templates/invite-template-types";
import type { InvitationPackagePricing } from "@/lib/vmb/invites/invitation-package-pricing";
import { formatInvitationPrice } from "@/lib/vmb/invites/invitation-package-pricing";

type Props = {
  pkg: VmbDefaultInvitationPackage;
  pricing?: InvitationPackagePricing;
  templateId?: string;
  serviceFallbackById?: Record<string, string | undefined>;
  rewardFallbackById?: Record<string, string | undefined>;
  title?: string;
};

/** Read-only summary of Admin Default service / add-on / expiration / pricing package. */
export function AdminDefaultPackageSummary({
  pkg,
  pricing: pricingProp,
  templateId,
  serviceFallbackById,
  rewardFallbackById,
  title = "Admin default package",
}: Props) {
  const resolvedPricing =
    pricingProp ??
    (templateId ? resolveAdminDefaultInvitationPackageWithPricing(templateId)?.pricing : undefined);

  const services = resolveNailOfferServiceLabels(pkg.serviceIds, serviceFallbackById);
  const rewards = resolveNailOfferAddonLabels(pkg.serviceOptionIds, rewardFallbackById);

  return (
    <div className="vmb-admin-default-package">
      <p className="vmb-admin-default-package__title">{title}</p>
      <dl className="vmb-admin-default-package__list">
        <div>
          <dt>Services</dt>
          <dd>{services.length > 0 ? services.join(", ") : "—"}</dd>
        </div>
        <div>
          <dt>Add-ons</dt>
          <dd>{rewards.length > 0 ? rewards.join(", ") : "—"}</dd>
        </div>
        <div>
          <dt>Expiration</dt>
          <dd>{pkg.expirationLabel}</dd>
        </div>
        {resolvedPricing ? (
          <>
            <div>
              <dt>Value</dt>
              <dd>{resolvedPricing.valueLabel}</dd>
            </div>
            <div>
              <dt>Savings</dt>
              <dd>{formatInvitationPrice(resolvedPricing.savingsAmount)}</dd>
            </div>
            <div>
              <dt>Offer</dt>
              <dd>{resolvedPricing.priceLabel}</dd>
            </div>
          </>
        ) : null}
        {pkg.priceLabel?.trim() ? (
          <div>
            <dt>Caption</dt>
            <dd>{pkg.priceLabel.trim()}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

export function InvitationPricingRows({
  pricing,
}: {
  pricing: InvitationPackagePricing;
}) {
  return (
    <>
      <PricingRow label="Value" value={pricing.valueLabel} />
      {pricing.savingsAmount > 0 ? (
        <PricingRow label="Savings" value={formatInvitationPrice(pricing.savingsAmount)} />
      ) : null}
      <PricingRow label="Offer" value={pricing.priceLabel} />
    </>
  );
}

function PricingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="vmb-admin-default-package__pricing-row">
      <span className="vmb-admin-default-package__pricing-label">{label}</span>
      <span className="vmb-admin-default-package__pricing-value">{value}</span>
    </div>
  );
}
