export type PcnInviteSignals = {
  recipientName?: string;
  visitCount?: number;
  lastVisit?: string;
  serviceName?: string;
  subjectLabel?: string;
  isVip?: boolean;
  isReferral?: boolean;
  ticketValue?: number;
  discoveryText?: string;
  recommendationText?: string;
};

function firstName(name?: string): string {
  const trimmed = name?.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] || trimmed;
}

function parseVisitCount(...sources: Array<string | undefined>): number | undefined {
  for (const source of sources) {
    if (!source) continue;
    const match = source.match(/(\d+)\s+visits?/i);
    if (match) return Number.parseInt(match[1], 10);
  }
  return undefined;
}

function parseServiceName(...sources: Array<string | undefined>): string | undefined {
  for (const source of sources) {
    if (!source) continue;
    const quoted = source.match(/Service "([^"]+)"/i);
    if (quoted?.[1]) return quoted[1];
    const service = source.match(/\b(color|balayage|cut|facial|wax|lash|brow|mani|pedi)[^.,;]*/i);
    if (service?.[0]) return service[0].trim();
  }
  return undefined;
}

function haystack(signals: PcnInviteSignals): string {
  return [
    signals.subjectLabel,
    signals.discoveryText,
    signals.recommendationText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function recognitionLine(signals: PcnInviteSignals): string {
  const text = haystack(signals);
  const visits = signals.visitCount ?? parseVisitCount(signals.discoveryText, signals.recommendationText);
  const service = signals.serviceName ?? parseServiceName(signals.discoveryText, signals.recommendationText);
  const vip =
    signals.isVip ||
    (signals.ticketValue ?? 0) >= 250 ||
    text.includes("vip") ||
    text.includes("high value") ||
    text.includes("above-average");
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
    return `It has been good having you in recently — your last visit was ${signals.lastVisit}.`;
  }
  return "You are exactly the kind of client I built this network for.";
}

function trimToWordBudget(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(" ")}…`;
}

export function buildPcnInviteBody(signals: PcnInviteSignals): string {
  const recognition = recognitionLine(signals);
  const paragraphs = [
    "I wanted to personally invite you into my private client network.",
    recognition,
    "This is where I'll share first looks, private openings, and little client-only invites before they go anywhere else.",
    "I'd love to have you in.",
  ];
  return trimToWordBudget(paragraphs.join("\n\n"), 120);
}

export function buildPcnInviteSalutation(recipientName?: string): string {
  const name = firstName(recipientName);
  return name === "there" ? "Dear friend," : `Dear ${name},`;
}

export function buildPcnInviteCta(): string {
  return "Join Private Client Network";
}

export function pcnSignalsFromText(input: {
  recipientName?: string;
  subjectLabel?: string;
  discoveryText?: string;
  recommendationText?: string;
  ticketValue?: number;
  lastVisit?: string;
  serviceName?: string;
  visitCount?: number;
}): PcnInviteSignals {
  const hay = [
    input.subjectLabel,
    input.discoveryText,
    input.recommendationText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return {
    recipientName: input.recipientName,
    visitCount: input.visitCount ?? parseVisitCount(input.discoveryText, input.recommendationText),
    lastVisit: input.lastVisit,
    serviceName: input.serviceName ?? parseServiceName(input.discoveryText, input.recommendationText),
    subjectLabel: input.subjectLabel,
    isVip: hay.includes("vip") || hay.includes("high value") || (input.ticketValue ?? 0) >= 250,
    isReferral:
      hay.includes("referral") ||
      hay.includes("ambassador") ||
      hay.includes("bring other") ||
      hay.includes("network"),
    ticketValue: input.ticketValue,
    discoveryText: input.discoveryText,
    recommendationText: input.recommendationText,
  };
}
