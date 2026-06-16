import type { VmbCardType } from "@/lib/vmb/cards/card-types";
import { buildRelationshipFirstPersonalInviteFallback } from "@/lib/vmb/cards/relationship-first-invite-copy";

export type PersonalInviteCopy = {
  greeting: string;
  personalConnection: string;
  inviteMessage: string;
  offerMessage: string;
  signature: string;
  primaryCta: string;
  secondaryCta: string;
};

export type PersonalInviteCopyContext = {
  recipientName?: string;
  cardType?: VmbCardType;
  serviceName?: string;
  visitCount?: number;
  lastVisit?: string;
  actionLabel?: string;
  salonName?: string;
  techName?: string;
  subjectLabel?: string;
  discoveryText?: string;
  recommendationText?: string;
  ticketValue?: number;
};

/** Deterministic personal invite copy — relationship-first defaults, no AI. */
export function buildPersonalInviteCopy(context: PersonalInviteCopyContext): PersonalInviteCopy {
  return buildRelationshipFirstPersonalInviteFallback(context);
}

export function buildTechIdentityLine(input: {
  techName?: string;
  salonName?: string;
}): string {
  const tech = input.techName?.trim() || "Your stylist";
  const salon = input.salonName?.trim() || "Your Salon";
  return `${tech} from ${salon}`;
}

export function buildPrivateNoteLine(recipientName?: string): string {
  const trimmed = recipientName?.trim();
  const first = trimmed?.split(/\s+/)[0];
  if (!first) return "A private note for you";
  return `A private note for ${first}`;
}

export function inviteCopyToBody(copy: PersonalInviteCopy): string {
  return [copy.personalConnection, copy.inviteMessage, copy.offerMessage].filter(Boolean).join("\n\n");
}
