import type { InviteTemplateTokenContext } from "./invite-template-types";

export const INVITE_TEMPLATE_PREVIEW_CONTEXT: InviteTemplateTokenContext = {
  clientName: "Sarah",
  salonName: "Luxe Nail Studio",
  providerName: "Jess",
  offerName: "Birthday Babe",
  offerPrice: "$115",
  claimLink: "#",
};

export function applyInviteTemplateTokens(
  text: string,
  context: InviteTemplateTokenContext,
): string {
  if (!text) return "";
  return text
    .replaceAll("{clientName}", context.clientName)
    .replaceAll("{salonName}", context.salonName)
    .replaceAll("{providerName}", context.providerName)
    .replaceAll("{offerName}", context.offerName ?? "your offer")
    .replaceAll("{offerPrice}", context.offerPrice ?? "")
    .replaceAll("{claimLink}", context.claimLink ?? "#");
}
