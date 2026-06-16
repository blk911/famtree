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
  styleName?: string;
  preferredDay?: string;
  preferredTime?: string;
};

function splitNextOpening(nextOpening?: string): { preferredDay?: string; preferredTime?: string } {
  const value = nextOpening?.trim();
  if (!value) return {};
  const atIndex = value.toLowerCase().indexOf(" at ");
  if (atIndex === -1) {
    return { preferredDay: value };
  }
  return {
    preferredDay: value.slice(0, atIndex).trim(),
    preferredTime: value.slice(atIndex + 4).trim(),
  };
}

function firstName(name?: string): string {
  const trimmed = name?.trim();
  if (!trimmed) return "Friend";
  return trimmed.split(/\s+/)[0] || trimmed;
}

export function buildTemplateTokenContext(
  input: CardTemplateInput,
  ownerName?: string,
): TemplateTokenContext {
  const nextOpening = input.nextOpening?.trim();
  const openingParts = splitNextOpening(nextOpening);
  const serviceName = input.serviceName?.trim();

  return {
    clientName: firstName(input.recipientName),
    ownerName: ownerName?.trim() || input.techName?.trim() || "Your stylist",
    salonName: input.salonName?.trim() || "Your Salon",
    serviceName,
    lastVisit: input.lastVisit?.trim(),
    visitCount: input.visitCount,
    referralCount: input.referralCount,
    offer: input.recommendationText?.trim(),
    offerValue: undefined,
    offerTerms: undefined,
    nextOpening,
    styleName: serviceName,
    preferredDay: openingParts.preferredDay,
    preferredTime: openingParts.preferredTime,
  };
}

export function applyTemplateTokens(template: string, context: TemplateTokenContext): string {
  let result = template;
  const lastAppointmentDate = context.lastVisit;
  const replacements: Record<string, string | undefined> = {
    "{clientName}": context.clientName,
    "{ownerName}": context.ownerName,
    "{salonName}": context.salonName,
    "{serviceName}": context.serviceName,
    "{lastVisit}": context.lastVisit,
    "{lastAppointmentDate}": lastAppointmentDate,
    "{visitCount}": context.visitCount != null ? String(context.visitCount) : undefined,
    "{referralCount}": context.referralCount != null ? String(context.referralCount) : undefined,
    "{offer}": context.offer,
    "{offerValue}": context.offerValue,
    "{offerTerms}": context.offerTerms,
    "{nextOpening}": context.nextOpening,
    "{styleName}": context.styleName ?? context.serviceName,
    "{preferredDay}": context.preferredDay,
    "{preferredTime}": context.preferredTime,
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
