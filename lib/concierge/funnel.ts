/** Canonical funnel positions — conversation engine tracks exactly one active stage per session. */
export const FUNNEL_STAGES = [
  "greeting",
  "intent_capture",
  "discovery",
  "recommendation",
  "pricing",
  "booking_interest",
  "lead_capture",
  "escalation",
  "followup",
] as const;

export type FunnelStage = (typeof FUNNEL_STAGES)[number];

export function isFunnelStage(s: string): s is FunnelStage {
  return (FUNNEL_STAGES as readonly string[]).includes(s);
}

/** Chips surfaced after each assistant turn (relationship-forward tone). */
export const QUICK_REPLIES_BY_STAGE: Record<FunnelStage, string[]> = {
  greeting: ["Tell me about Studios", "I'm browsing providers", "I run a studio"],
  intent_capture: ["Pricing vibe", "How invites work", "Something feels unclear"],
  discovery: ["What makes this different from IG?", "How clients request access", "Referrals"],
  recommendation: ["Show tiers / packages", "How referrals route", "Security / privacy"],
  pricing: ["What does membership cost?", "What's included?", "Talk timing"],
  booking_interest: ["I'd love an intro", "Send availability hints", "Not ready yet"],
  lead_capture: ["Here's my cell", "Email works better", "DM my IG"],
  escalation: ["Leave my details", "I'll wait — ping me", "Never mind"],
  followup: ["Anything else?", "Thanks — bye for now"],
};

const PRICE_RX = /\b(price|pricing|cost|how much|rates?|investment|package)\b/i;
const BOOK_RX = /\b(book|schedule|appointment|session|slot|availability|calendar|intro)\b/i;
const CONFUSE_RX = /\b(don'?t understand|what do you mean|repeat that|confus(?:ed|ing))\b/i;
const HUMAN_RX = /\b(real person|human|talk to (someone|you)|manager|owner)\b/i;
const CONTACT_RX = /[\w._%+-]+@[\w.-]+\.[a-z]{2,}|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b|@\w+/i;

export function bumpConfusion(userText: string, prev: number): number {
  if (CONFUSE_RX.test(userText)) return prev + 1;
  return prev;
}

/**
 * Advance funnel using lightweight signals — deterministic without secondary model hops.
 */
export function nextFunnelStage(
  current: string,
  userText: string,
  confusionSignals: number,
): FunnelStage {
  const stage: FunnelStage = isFunnelStage(current) ? current : "greeting";

  if (HUMAN_RX.test(userText) || confusionSignals >= 2 || CONTACT_RX.test(userText)) {
    return "lead_capture";
  }
  if (confusionSignals >= 1 && stage !== "lead_capture") {
    return stage === "escalation" ? "lead_capture" : "escalation";
  }
  if (PRICE_RX.test(userText)) return "pricing";
  if (BOOK_RX.test(userText)) return "booking_interest";

  const progression: Partial<Record<FunnelStage, FunnelStage>> = {
    greeting: "intent_capture",
    intent_capture: "discovery",
    discovery: "recommendation",
    recommendation: "followup",
    pricing: "booking_interest",
    booking_interest: "lead_capture",
    escalation: "lead_capture",
    followup: "followup",
    lead_capture: "followup",
  };

  return progression[stage] ?? "discovery";
}
