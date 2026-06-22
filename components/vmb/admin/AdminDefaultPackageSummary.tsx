"use client";



import {

  resolveNailOfferAddonLabels,

  resolveNailOfferServiceLabels,

} from "@/lib/vmb/admin/nail-offer-builder-selections";

import { resolveAdminDefaultInvitationPackageWithPricing } from "@/lib/vmb/invite-templates/admin-default-invitation-package";

import type { VmbDefaultInvitationPackage } from "@/lib/vmb/invite-templates/invite-template-types";

import type { InvitationPackagePricing } from "@/lib/vmb/invites/invitation-package-pricing";

import { formatInvitationPrice } from "@/lib/vmb/invites/invitation-package-pricing";
import {
  defaultNailAddonPrice,
  defaultNailServicePrice,
} from "@/lib/vmb/services/default-nail-pricing";



type Props = {

  pkg: VmbDefaultInvitationPackage;

  pricing?: InvitationPackagePricing;

  templateId?: string;

  serviceFallbackById?: Record<string, string | undefined>;

  rewardFallbackById?: Record<string, string | undefined>;

  title?: string;

};

type OfferPricingSummaryProps = {
  serviceIds: string[];
  serviceOptionIds: string[];
  expirationLabel: string;
  pricing: InvitationPackagePricing;
  serviceFallbackById?: Record<string, string | undefined>;
  rewardFallbackById?: Record<string, string | undefined>;
};

export function OfferPricingSummary({
  serviceIds,
  serviceOptionIds,
  expirationLabel,
  pricing,
  serviceFallbackById,
  rewardFallbackById,
}: OfferPricingSummaryProps) {
  const services = serviceIds.map((id) => ({
    id,
    label: resolveNailOfferServiceLabels([id], serviceFallbackById)[0] ?? id,
    price: defaultNailServicePrice(id),
  }));
  const options = serviceOptionIds.map((id) => ({
    id,
    label: resolveNailOfferAddonLabels([id], rewardFallbackById)[0] ?? id,
    price: defaultNailAddonPrice(id),
  }));

  return (
    <section className="vmb-offer-pricing" aria-label="Offer pricing">
      <p className="vmb-admin-default-package__title">Offer pricing</p>
      <div className="vmb-offer-pricing__items">
        {services.map((service) => (
          <div className="vmb-offer-pricing__line" key={service.id}>
            <span>{service.label}</span>
            <strong>{formatInvitationPrice(service.price)}</strong>
          </div>
        ))}
        {options.map((option) => (
          <div className="vmb-offer-pricing__line" key={option.id}>
            <span>{option.label}</span>
            <strong>+{formatInvitationPrice(option.price)}</strong>
          </div>
        ))}
      </div>
      <div className="vmb-offer-pricing__totals">
        <div className="vmb-offer-pricing__line">
          <span>Package value</span>
          <strong>{pricing.valueLabel}</strong>
        </div>
        {pricing.savingsAmount > 0 ? (
          <div className="vmb-offer-pricing__line">
            <span>Offer savings</span>
            <strong>-{formatInvitationPrice(pricing.savingsAmount)}</strong>
          </div>
        ) : null}
        <div className="vmb-offer-pricing__line vmb-offer-pricing__line--total">
          <span>Offer total</span>
          <strong>{pricing.priceLabel}</strong>
        </div>
        <div className="vmb-offer-pricing__expiration">
          <span>Expiration</span>
          <strong>{expirationLabel}</strong>
        </div>
      </div>
    </section>
  );
}



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

