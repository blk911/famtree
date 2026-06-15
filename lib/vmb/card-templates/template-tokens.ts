import type { CardTemplateInput } from "@/lib/vmb/cards/card-preview-model";

export type TemplateTokenContext = {
  clientName?: string;
  ownerName?: string;
  salonName?: string;
  serviceName?: string;
  lastVisit?: string;
  visitCount?: number;
  referralCount?: number;
  offer?: string;
  offerValue?: string;
  offerTerms?: string;
  nextOpening?: string;
};

function firstName(name?: string): string {
  const trimmed = name?.trim();
  if (!trimmed) return "Friend";
  return trimmed.split(/\s+/)[0] || trimmed;
}

export function buildTemplateTokenContext(
  input: CardTemplateInput,
  ownerName?: string,
): TemplateTokenContext {
  return {
    clientName: firstName(input.recipientName),
    ownerName: ownerName?.trim() || input.techName?.trim() || "Your stylist",
    salonName: input.salonName?.trim() || "Your Salon",
    serviceName: input.serviceName?.trim(),
    lastVisit: input.lastVisit?.trim(),
    visitCount: input.visitCount,
    referralCount: input.referralCount,
    offer: input.recommendationText?.trim(),
    offerValue: undefined,
    offerTerms: undefined,
    nextOpening: undefined,
  };
}

export function applyTemplateTokens(template: string, context: TemplateTokenContext): string {
  let result = template;
  const replacements: Record<string, string | undefined> = {
    "{clientName}": context.clientName,
    "{ownerName}": context.ownerName,
    "{salonName}": context.salonName,
    "{serviceName}": context.serviceName,
    "{lastVisit}": context.lastVisit,
    "{visitCount}": context.visitCount != null ? String(context.visitCount) : undefined,
    "{referralCount}": context.referralCount != null ? String(context.referralCount) : undefined,
    "{offer}": context.offer,
    "{offerValue}": context.offerValue,
    "{offerTerms}": context.offerTerms,
    "{nextOpening}": context.nextOpening,
  };

  for (const [token, value] of Object.entries(replacements)) {
    result = result.split(token).join(value ?? "");
  }

  return result.replace(/\s{2,}/g, " ").trim();
}

export function withOfferTokens(
  context: TemplateTokenContext,
  offerText?: string,
  valueLabel?: string,
  terms?: string,
): TemplateTokenContext {
  return {
    ...context,
    offer: offerText ?? context.offer,
    offerValue: valueLabel,
    offerTerms: terms,
  };
}
