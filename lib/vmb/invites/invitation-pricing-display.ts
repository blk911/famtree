import type { InviteTemplateSnapshot } from "@/lib/vmb/invites/invite-template-snapshot";

import {

  formatInvitationPrice,

  pricingFromSnapshotFields,

  type InvitationPackagePricing,

} from "@/lib/vmb/invites/invitation-package-pricing";



export function resolveInvitationPricing(

  snapshot: InviteTemplateSnapshot,

): InvitationPackagePricing {

  return pricingFromSnapshotFields(snapshot);

}



export function formatSavingsLabel(pricing: InvitationPackagePricing): string {

  return formatInvitationPrice(pricing.savingsAmount);

}


