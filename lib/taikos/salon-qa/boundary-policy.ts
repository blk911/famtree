import { buildSalonClientIndex, type EnrichedSalonClient } from "./salon-client-index";
import type { SalonQueryMatch } from "./types";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import type { VmbBookRecord } from "@/types/vmb/provider-ingest";

export type SalonQaBoundary =
  | "in_bounds"
  | "missing_data"
  | "low_confidence"
  | "out_of_bounds"
  | "unsafe_action";

export type SalonQaBoundaryDecision = {
  boundary: SalonQaBoundary;
  reason: string;
  safeReply?: string;
  suggestedQuestions?: string[];
};

export type SalonQaBoundaryContext = {
  records: VmbBookRecord[];
  analysis: VmbBookAnalysisResult;
  clients?: EnrichedSalonClient[];
  hasBirthdayData?: boolean;
  hasBookingChannelData?: boolean;
  hasScheduleData?: boolean;
};

export const BOUNDARY_OUT_OF_BOUNDS_REPLY = `I'm built to help with your salon business and the client book you've loaded.
I can help find clients, services, opportunities, invites, follow-ups, and relationship next steps.
Try asking:
• Who should join my PCN?
• Who is overdue?
• Tell me about Maya
• Who were my January clients?`;

export const BOUNDARY_MISSING_DATA_REPLY = `I don't see that information in this client book yet.
I can still help look for related clients or opportunities.`;

export const BOUNDARY_LOW_CONFIDENCE_REPLY = `I'm not confident I found the right match.
Give me a name, service, month, or clue and I'll narrow it down.`;

export const BOUNDARY_UNSAFE_ACTION_REPLY = `I can help prepare and preview that, but I won't send anything automatically.
You review.
You approve.
You stay in control.`;

export const OUT_OF_BOUNDS_SUGGESTIONS = [
  "Who should join my PCN?",
  "Who is overdue?",
  "Tell me about Maya",
  "Who were my January clients?",
];

export const LOW_CONFIDENCE_SUGGESTIONS = [
  "Tell me about Maya",
  "Who got Gel-X?",
  "Who came in January?",
];

export const MISSING_DATA_SUGGESTIONS = [
  "Who is overdue?",
  "Who should receive a thank-you?",
  "Who should join my PCN?",
];

export const BOUNDARY_FORBIDDEN_PHRASES = [
  "as an ai",
  "as a language model",
  "i searched the web",
  "according to the internet",
  "message was sent",
  "text was sent",
  "appointment was booked",
  "i booked",
  "automatically sent",
  "auto-sent",
  "i charged",
] as const;

const UNSAFE_PATTERNS: RegExp[] = [
  /\bsend (?:this|it|that|them|messages?|texts?|invites?|emails?)\s+(?:to\s+)?(?:everyone|all clients?|all overdue|every client)/i,
  /\btext all\b/i,
  /\bmessage all clients?\b/i,
  /\b(?:blast|spam|mass text|mass message)\b/i,
  /\b(?:automatically|auto[- ]?)(?:book|send|text|message|charge|queue)\b/i,
  /\b(?:book|charge|contact) (?:them|everyone|all clients?)\b/i,
  /\bwithout (?:my )?approval\b/i,
  /\bright now\b.*\b(?:text|message|send|contact)\b/i,
  /\b(?:text|message|send) all overdue clients now\b/i,
];

const OUT_OF_BOUNDS_PATTERNS: RegExp[] = [
  /\bweather\b/i,
  /\bforecast\b/i,
  /\bwho should i vote\b/i,
  /\bpolitics\b/i,
  /\belection\b/i,
  /\bdiagnos(?:e|is)\b/i,
  /\brash\b/i,
  /\bmedical advice\b/i,
  /\blegal advice\b/i,
  /\blawyer\b/i,
  /\bquantum physics\b/i,
  /\bsports score\b/i,
  /\bstock market\b/i,
  /\bcryptocurrency\b/i,
  /\brecipe for\b/i,
  /\bwho won the (?:game|match)\b/i,
];

const LOW_CONFIDENCE_PATTERNS: RegExp[] = [
  /\bwho was that (?:girl|guy|person|client|one|woman|man)\b/i,
  /\bthe january person\b/i,
  /\bthe one with nails\b/i,
  /\bwho was she\b/i,
  /\bwho was he\b/i,
  /\bthat girl\b/i,
  /\bthat guy\b/i,
  /\bthe person from\b/i,
];

function normalize(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

function isVagueSalonQuery(normalized: string, match: SalonQueryMatch): boolean {
  if (match.queryMode === "client" && match.clientNameHint) {
    const hint = match.clientNameHint.toLowerCase();
    if (hint.length <= 2 || /^(she|he|her|him|that|the one)$/i.test(hint)) return true;
  }
  if (match.intent === "unknown" && match.confidence < 0.35) return true;
  if (/\bthat (?:girl|guy|one|person|client)\b/.test(normalized) && !match.clientNameHint) return true;
  return false;
}

function detectMissingData(
  question: string,
  match: SalonQueryMatch,
  context: SalonQaBoundaryContext,
): string | null {
  const normalized = normalize(question);
  const hasBirthdayData = context.hasBirthdayData ?? context.clients?.some((c) => c.birthdaySignal) ?? false;
  const hasBookingChannelData =
    context.hasBookingChannelData ??
    context.records.some((r) => /\bonline\b|booking channel|booked online/i.test(r.notes ?? ""));
  const hasScheduleData = context.hasScheduleData ?? false;

  if (
    (match.intent === "birthday_candidates" || /\bbirthday/i.test(normalized)) &&
    /\bwho (?:has|have|got|gets)\b.*\bbirthday/i.test(normalized) &&
    !hasBirthdayData
  ) {
    return "Birthday dates are not available in this client book export.";
  }

  if (/\bbooked online\b|\bonline booking\b|\bbooking channel\b/i.test(normalized) && !hasBookingChannelData) {
    return "This export does not include booking channel details.";
  }

  if (
    (/\btomorrow\b.*\b(open|slot|opening|chair)\b|\bopen slot\b.*\btomorrow\b/i.test(normalized) ||
      match.intent === "open_slot_candidates") &&
    /\btomorrow\b|\bschedule\b|\bcalendar\b/i.test(normalized) &&
    !hasScheduleData
  ) {
    return "Live schedule and open-slot timing are not loaded from this book export.";
  }

  return null;
}

export function buildSalonQaBoundaryContext(
  analysis: VmbBookAnalysisResult,
  records: VmbBookRecord[],
): SalonQaBoundaryContext {
  const clients = buildSalonClientIndex(analysis);
  return {
    records,
    analysis,
    clients,
    hasBirthdayData: clients.some((c) => c.birthdaySignal),
    hasBookingChannelData: records.some((r) => /\bonline\b|booking channel|booked online/i.test(r.notes ?? "")),
    hasScheduleData: false,
  };
}

export function classifySalonQaBoundary(
  question: string,
  match: SalonQueryMatch,
  context: SalonQaBoundaryContext,
): SalonQaBoundaryDecision {
  const normalized = normalize(question);

  if (UNSAFE_PATTERNS.some((pattern) => pattern.test(question))) {
    return {
      boundary: "unsafe_action",
      reason: "Request asks for unsupervised send, contact, booking, or charge action.",
      safeReply: BOUNDARY_UNSAFE_ACTION_REPLY,
      suggestedQuestions: ["Who is overdue?", "Who should join my PCN?"],
    };
  }

  if (OUT_OF_BOUNDS_PATTERNS.some((pattern) => pattern.test(question))) {
    return {
      boundary: "out_of_bounds",
      reason: "Question is outside salon business and client book scope.",
      safeReply: BOUNDARY_OUT_OF_BOUNDS_REPLY,
      suggestedQuestions: OUT_OF_BOUNDS_SUGGESTIONS,
    };
  }

  if (LOW_CONFIDENCE_PATTERNS.some((pattern) => pattern.test(question)) || isVagueSalonQuery(normalized, match)) {
    return {
      boundary: "low_confidence",
      reason: "Question is too vague to match a specific client or book fact.",
      safeReply: BOUNDARY_LOW_CONFIDENCE_REPLY,
      suggestedQuestions: LOW_CONFIDENCE_SUGGESTIONS,
    };
  }

  const missingReason = detectMissingData(question, match, context);
  if (missingReason) {
    return {
      boundary: "missing_data",
      reason: missingReason,
      safeReply: BOUNDARY_MISSING_DATA_REPLY,
      suggestedQuestions: MISSING_DATA_SUGGESTIONS,
    };
  }

  if (match.intent === "unknown" && match.confidence < 0.45) {
    return {
      boundary: "out_of_bounds",
      reason: "Question does not map to a supported salon book query.",
      safeReply: BOUNDARY_OUT_OF_BOUNDS_REPLY,
      suggestedQuestions: OUT_OF_BOUNDS_SUGGESTIONS,
    };
  }

  return {
    boundary: "in_bounds",
    reason: "Question matches salon book scope.",
  };
}

export function boundaryAnswerHeadline(boundary: SalonQaBoundary): string {
  switch (boundary) {
    case "out_of_bounds":
      return "Let's stay focused on your salon book";
    case "missing_data":
      return "That detail isn't in this book yet";
    case "low_confidence":
      return "I need a clearer clue";
    case "unsafe_action":
      return "You stay in control";
    default:
      return "Salon book answer";
  }
}

export function boundaryFollowUpPrompt(boundary: SalonQaBoundary): string {
  switch (boundary) {
    case "out_of_bounds":
      return "Try asking about your clients, services, or opportunities.";
    case "missing_data":
      return "I can still help look for related clients or opportunities.";
    case "low_confidence":
      return "Give me a name, service, month, or clue and I'll narrow it down.";
    case "unsafe_action":
      return "Preview first, then approve anything you want to queue.";
    default:
      return "What else would you like to explore in your book?";
  }
}

export function salonQaBoundaryBadge(boundary: SalonQaBoundary): string {
  switch (boundary) {
    case "out_of_bounds":
      return "Out of bounds";
    case "low_confidence":
      return "Needs more detail";
    case "missing_data":
      return "Missing data";
    case "unsafe_action":
      return "Review required";
    default:
      return "";
  }
}

export function boundaryAnswerContainsForbiddenLanguage(text: string): boolean {
  const hay = text.toLowerCase();
  return BOUNDARY_FORBIDDEN_PHRASES.some((phrase) => hay.includes(phrase));
}
