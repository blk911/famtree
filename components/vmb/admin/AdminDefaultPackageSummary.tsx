"use client";

import {
  resolveNailOfferAddonLabels,
  resolveNailOfferServiceLabels,
} from "@/lib/vmb/admin/nail-offer-builder-selections";
import type { VmbDefaultInvitationPackage } from "@/lib/vmb/invite-templates/invite-template-types";

type Props = {
  pkg: VmbDefaultInvitationPackage;
  serviceFallbackById?: Record<string, string | undefined>;
  rewardFallbackById?: Record<string, string | undefined>;
  title?: string;
};

/** Read-only summary of Admin Default service / add-on / expiration package. */
export function AdminDefaultPackageSummary({
  pkg,
  serviceFallbackById,
  rewardFallbackById,
  title = "Admin default package",
}: Props) {
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
        {pkg.priceLabel?.trim() ? (
          <div>
            <dt>Price label</dt>
            <dd>{pkg.priceLabel.trim()}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
