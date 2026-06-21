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

  const serviceLabel = services.length > 0 ? services.join(", ") : "—";

  const rewardLabel = rewards.length > 0 ? rewards.join(", ") : "";



  return (

    <div className="vmb-admin-default-package">

      <p className="vmb-admin-default-package__title">{title}</p>

      <dl className="vmb-admin-default-package__list">

        <div className="vmb-admin-default-package__service-stack">

          <dd className="vmb-admin-default-package__service">{serviceLabel}</dd>

          {rewardLabel ? <dd className="vmb-admin-default-package__reward">{rewardLabel}</dd> : null}

        </div>

        {resolvedPricing ? (

          <>

            <div className="vmb-admin-default-package__price">

              <dt>Value</dt>

              <dd>{resolvedPricing.valueLabel}</dd>

            </div>

            <div className="vmb-admin-default-package__price">

              <dt>Savings</dt>

              <dd>{formatInvitationPrice(resolvedPricing.savingsAmount)}</dd>

            </div>

            <div className="vmb-admin-default-package__price">

              <dt>Offer</dt>

              <dd>{resolvedPricing.priceLabel}</dd>

            </div>

          </>

        ) : null}

        <div className="vmb-admin-default-package__expiration">

          <dt>Expiration</dt>

          <dd>{pkg.expirationLabel}</dd>

        </div>

        {pkg.priceLabel?.trim() ? (

          <div className="vmb-admin-default-package__caption">

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


