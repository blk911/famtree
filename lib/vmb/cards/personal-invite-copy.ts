import type { VmbCardType } from "@/lib/vmb/cards/card-types";
import { pcnSignalsFromText, type PcnInviteSignals } from "@/lib/vmb/cards/pcn-invite-copy";

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

function firstName(name?: string): string {
  const trimmed = name?.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] || trimmed;
}

function recognitionLine(signals: PcnInviteSignals): string {
  const text = [
    signals.subjectLabel,
    signals.discoveryText,
    signals.recommendationText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const visits = signals.visitCount;
  const service = signals.serviceName;
  const vip =
    signals.isVip ||
    (signals.ticketValue ?? 0) >= 250 ||
    text.includes("vip") ||
    text.includes("high value");
  const referral =
    signals.isReferral ||
    text.includes("referral") ||
    text.includes("ambassador") ||
    text.includes("bring other") ||
    text.includes("connected");

  if (referral && visits && visits >= 3) {
    return "You've been in a few times this year, and I always notice the clients who make the room feel easy.";
  }
  if (referral) {
    return "You are the kind of client who quietly brings good energy — and sometimes good people — through the door.";
  }
  if (vip && visits && visits >= 4) {
    return "You've been in several times, and I always notice the clients who make the room feel easy.";
  }
  if (vip) {
    return "You are one of the clients who make this salon feel personal — not just busy.";
  }
  if (service) {
    return `I always remember your ${service.toLowerCase()} appointments — you know how to make a visit feel calm.`;
  }
  if (visits && visits >= 6) {
    return "You have been one of my regulars, and that consistency means a lot in a busy salon week.";
  }
  if (visits && visits >= 2) {
    return "You've been in a few times, and I appreciate how easy you are to work with.";
  }
  if (signals.lastVisit) {
    return "You've been in recently, and I wanted to reach out while you're on my mind.";
  }
  return "You are exactly the kind of client I built this network for.";
}

function offerLine(signals: PcnInviteSignals): string {
  const service = signals.serviceName?.trim();
  const serviceLower = service?.toLowerCase();

  if (serviceLower?.includes("set") || serviceLower?.includes("fill") || serviceLower?.includes("mani")) {
    return "It looks like you may be due for another set soon. If you want, I can send a few private openings.";
  }
  if (serviceLower?.includes("color") || serviceLower?.includes("highlight") || serviceLower?.includes("balayage")) {
    return "If you're thinking about your next color visit, I can hold a couple of private openings just for you.";
  }
  if (serviceLower?.includes("cut") || serviceLower?.includes("trim")) {
    return "If you'd like to get back on the books, I can send a few times that work before they go public.";
  }
  if (signals.lastVisit) {
    return "If you want, I can send a few private openings that fit your usual rhythm.";
  }
  return "Whenever you're ready, I can send a few private openings before they go anywhere else.";
}

function signatureLine(techName?: string): string {
  const tech = techName?.trim() || "Your stylist";
  return `${tech} ❤️`;
}

/** Deterministic personal invite copy — no AI. */
export function buildPersonalInviteCopy(context: PersonalInviteCopyContext): PersonalInviteCopy {
  const signals = pcnSignalsFromText(context);
  const name = firstName(context.recipientName);
  const greeting = name === "there" ? "Dear friend," : `Dear ${name},`;

  return {
    greeting,
    personalConnection: recognitionLine(signals),
    inviteMessage:
      "I wanted to personally invite you into my Private Client Network. This is where I share first access to openings, client-only offers, and little surprises before they go anywhere else.",
    offerMessage: offerLine(signals),
    signature: signatureLine(context.techName),
    primaryCta: "Join My Private Client Network",
    secondaryCta: "Book My Next Appointment",
  };
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
  const name = firstName(recipientName);
  return name === "there" ? "A private note for you" : `A private note for ${name}`;
}

export function inviteCopyToBody(copy: PersonalInviteCopy): string {
  return [copy.personalConnection, copy.inviteMessage, copy.offerMessage].filter(Boolean).join("\n\n");
}
