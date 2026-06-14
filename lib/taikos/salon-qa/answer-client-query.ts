import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import type { VmbBookRecord } from "@/types/vmb/provider-ingest";
import { buildSalonClientIndex, firstName, type EnrichedSalonClient } from "./salon-client-index";
import type { SalonClientDossier, SalonQaAnswer, SalonQaSuggestedAction, SalonQueryMatch } from "./types";

type Params = {
  question: string;
  match: SalonQueryMatch;
  analysis: VmbBookAnalysisResult;
  records: VmbBookRecord[];
};

function formatCurrency(amount: number): string {
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

function formatDate(iso?: string): string {
  if (!iso?.trim()) return "Not on file";
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return iso;
  return new Date(parsed).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function findClientRecords(records: VmbBookRecord[], hint: string): VmbBookRecord[] {
  const tokens = hint.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return records.filter((r) => {
    const name = r.clientName.toLowerCase();
    return tokens.every((t) => name.includes(t));
  });
}

function findEnrichedClient(clients: EnrichedSalonClient[], hint: string): EnrichedSalonClient | undefined {
  const tokens = hint.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return clients.find((c) => {
    const name = c.clientName.toLowerCase();
    return tokens.every((t) => name.includes(t));
  });
}

function buildOpportunitySignals(client?: EnrichedSalonClient): string[] {
  if (!client) return [];
  const signals: string[] = [];
  if (client.isOverdue || client.isLapsed) signals.push("Due for a personal reach-out");
  if (client.isVip || client.spend >= 150) signals.push("High relationship value");
  if (client.referralScore >= 20) signals.push("Referral potential");
  if (client.birthdaySignal) signals.push("Birthday or celebration moment");
  if (client.pcnScore >= 40) signals.push("Strong PCN candidate");
  if (client.isFrequent) signals.push("Frequent visitor");
  return signals.slice(0, 4);
}

function suggestedNextMove(client?: EnrichedSalonClient): string {
  if (!client) return "Try the full first name from your book.";
  if (client.isOverdue || client.isLapsed) {
    return `Send ${firstName(client.clientName)} a warm refresh invite based on their visit history.`;
  }
  if (client.pcnScore >= 40) {
    return `Consider a private client invite for ${firstName(client.clientName)}.`;
  }
  if (client.birthdaySignal) {
    return `A birthday note would feel personal for ${firstName(client.clientName)}.`;
  }
  if (client.referralScore >= 20) {
    return `Ask ${firstName(client.clientName)} for a trusted intro when the moment feels right.`;
  }
  return `Keep ${firstName(client.clientName)} close with a thank-you or early-access note.`;
}

function buildClientSuggestedAction(
  clientName: string,
  enriched?: EnrichedSalonClient,
): SalonQaSuggestedAction {
  if (
    enriched &&
    (enriched.pcnScore >= 40 ||
      enriched.isVip ||
      enriched.referralScore >= 20 ||
      (enriched.daysInactive !== null && enriched.daysInactive <= 60))
  ) {
    return {
      kind: "preview_card",
      label: "Preview Private Client Invite",
      cardType: "pcn_invite",
      clientName,
      reason: "Strong relationship fit for a private invite",
    };
  }
  if (enriched && (enriched.isOverdue || enriched.isLapsed)) {
    return {
      kind: "preview_card",
      label: "Preview Reconnect Invite",
      cardType: "reactivation_card",
      clientName,
      reason: "Worth a personal follow-up",
    };
  }
  if (enriched && (enriched.isVip || enriched.spend >= 150)) {
    return {
      kind: "preview_card",
      label: "Preview Thank-You Card",
      cardType: "thank_you_card",
      clientName,
      reason: "High relationship value",
    };
  }
  return {
    kind: "follow_up_query",
    label: "Find similar clients",
    question: `Who is similar to ${clientName}?`,
  };
}

export function answerClientQuery(params: Params): SalonQaAnswer {
  const hint = params.match.clientNameHint ?? params.question;
  const matchedRecords = findClientRecords(params.records, hint);
  const enrichedClients = buildSalonClientIndex(params.analysis);
  const enriched = findEnrichedClient(enrichedClients, hint);

  if (matchedRecords.length === 0 && !enriched) {
    return {
      question: params.question,
      queryMode: "client",
      intent: "client_lookup",
      confidence: params.match.confidence,
      headline: "Client not found",
      answerText: `I could not find ${hint} in your book. Try the full first name.`,
      results: [],
      suggestedCards: [],
      followUpPrompt: "Would you like me to search by service or time period instead?",
    };
  }

  const primary = matchedRecords[0];
  const clientName = enriched?.clientName ?? primary?.clientName ?? hint;
  const visits = enriched?.visitCount ?? primary?.visitCount ?? matchedRecords.length;
  const revenue =
    enriched?.spend ??
    matchedRecords.reduce((sum, r) => sum + (r.amountSpent ?? 0), 0);
  const lastVisit = primary?.lastVisitDate;
  const services = Array.from(
    new Set(
      [
        ...matchedRecords.map((r) => r.serviceName).filter(Boolean) as string[],
        ...(enriched?.services ?? []).filter((s) => !/\d+\s+visits?/i.test(s)),
      ].filter(Boolean),
    ),
  );

  const dossier: SalonClientDossier = {
    clientName,
    visits,
    lastVisit: lastVisit ? formatDate(lastVisit) : undefined,
    services,
    revenue,
    opportunitySignals: buildOpportunitySignals(enriched),
    suggestedNextMove: suggestedNextMove(enriched),
  };

  const serviceLine =
    services.length > 0 ? `Services include ${services.slice(0, 4).join(", ")}.` : "";
  const visitLine = `${clientName} has ${visits} visit${visits === 1 ? "" : "s"} on file`;
  const lastLine = lastVisit ? ` with the last visit on ${formatDate(lastVisit)}.` : ".";
  const revenueLine = revenue > 0 ? ` Visit value around ${formatCurrency(revenue)}.` : "";

  const suggestedAction = buildClientSuggestedAction(clientName, enriched);

  return {
    question: params.question,
    queryMode: "client",
    intent: "client_lookup",
    confidence: params.match.confidence,
    headline: clientName,
    answerText: `${visitLine}${lastLine}${serviceLine}${revenueLine}`.trim(),
    results: [
      {
        clientName,
        reason: dossier.suggestedNextMove,
        evidence: dossier.opportunitySignals,
      },
    ],
    suggestedAction,
    suggestedCards: [],
    followUpPrompt: "Would you like me to find similar clients in your book?",
    clientDossier: dossier,
  };
}
