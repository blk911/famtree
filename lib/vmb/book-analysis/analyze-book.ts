import crypto from "crypto";
import type {
  AnalyzeBookInput,
  VmbBookAnalysisResult,
  VmbBookOpportunity,
  VmbTrustedIntroOpportunity,
} from "@/types/vmb/book-analysis";
import type { VmbBookRecord } from "@/types/vmb/provider-ingest";

const MAX_REACTIVATION = 20;
const MAX_REFERRAL = 20;
const MAX_GIFT = 20;
const MAX_TRUSTED_INTRO = 30;
const REVENUE_CAP = 15000;

const GIFT_KEYWORDS = ["gift", "bridal", "event", "mother", "birthday", "package", "bridal"];

const INTRO_CATEGORIES: VmbTrustedIntroOpportunity["introCategory"][] = [
  "nails",
  "skin",
  "wax",
  "lashes",
  "massage",
];

function daysSince(dateStr?: string): number | null {
  if (!dateStr) return null;
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / (1000 * 60 * 60 * 24);
}

function defaultValue(record: VmbBookRecord): number {
  return record.amountSpent && record.amountSpent > 0 ? record.amountSpent : 85;
}

function oppId(type: string, clientName: string, suffix = ""): string {
  return `opp-${type}-${crypto.createHash("sha1").update(`${clientName}${suffix}`).digest("hex").slice(0, 8)}`;
}

function isStrongClient(record: VmbBookRecord): boolean {
  return (record.visitCount ?? 0) >= 3 || (record.amountSpent ?? 0) >= 120;
}

export function analyzeVmbBook(input: AnalyzeBookInput): VmbBookAnalysisResult {
  const reactivationTargets: VmbBookOpportunity[] = [];
  const referralOpportunities: VmbBookOpportunity[] = [];
  const giftOpportunities: VmbBookOpportunity[] = [];
  const trustedProviderIntroOpportunities: VmbTrustedIntroOpportunity[] = [];

  for (const record of input.records) {
    const value = defaultValue(record);
    const days = daysSince(record.lastVisitDate);
    const isLapsed = days === null || days > 90;
    const serviceLower = (record.serviceName ?? "").toLowerCase();

    if (isLapsed && reactivationTargets.length < MAX_REACTIVATION) {
      reactivationTargets.push({
        id: oppId("reactivation", record.clientName),
        clientName: record.clientName,
        opportunityType: "reactivation",
        summary: days
          ? `Last visit ${Math.floor(days)} days ago — win-back candidate.`
          : "No recent visit on file — gentle reactivation outreach.",
        estimatedValue: value,
        confidence: days && days > 180 ? "high" : "medium",
        suggestedAction: "Send a personal rebooking invite with a service they already love.",
      });
    }

    if (
      ((record.visitCount ?? 0) >= 3 || (record.amountSpent ?? 0) >= 120) &&
      referralOpportunities.length < MAX_REFERRAL
    ) {
      referralOpportunities.push({
        id: oppId("referral", record.clientName),
        clientName: record.clientName,
        opportunityType: "referral",
        summary: `Repeat client with ${record.visitCount ?? "multiple"} visits — strong referral potential.`,
        estimatedValue: Math.max(value, 95),
        confidence: (record.visitCount ?? 0) >= 5 ? "high" : "medium",
        suggestedAction: "Ask for a trusted beauty-circle intro.",
      });
    }

    const isGift =
      GIFT_KEYWORDS.some((k) => serviceLower.includes(k)) || (record.amountSpent ?? 0) >= 150;
    if (isGift && giftOpportunities.length < MAX_GIFT) {
      giftOpportunities.push({
        id: oppId("gift", record.clientName),
        clientName: record.clientName,
        opportunityType: "gift",
        summary: serviceLower
          ? `Service "${record.serviceName}" signals a gift or celebration moment.`
          : "Higher ticket visit — package as a gift or prepaid offer.",
        estimatedValue: Math.max(value, 120),
        confidence: serviceLower.includes("gift") || serviceLower.includes("bridal") ? "high" : "medium",
        suggestedAction: "Promote a gift card or group booking for their next celebration.",
      });
    }

    if (isStrongClient(record)) {
      for (const category of INTRO_CATEGORIES) {
        if (trustedProviderIntroOpportunities.length >= MAX_TRUSTED_INTRO) break;
        trustedProviderIntroOpportunities.push({
          id: oppId("intro", record.clientName, category),
          clientName: record.clientName,
          introCategory: category,
          promptText: `Ask ${record.clientName} for a trusted ${category} provider intro.`,
          status: "not_requested",
        });
      }
    }
  }

  const allOpps = [...reactivationTargets, ...referralOpportunities, ...giftOpportunities];
  let estimatedRecoverableRevenue = allOpps.reduce((s, o) => s + o.estimatedValue, 0);
  estimatedRecoverableRevenue = Math.min(estimatedRecoverableRevenue, REVENUE_CAP);

  return {
    analysisId: `analysis-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    trialId: input.trialId,
    salonName: input.salonName,
    providerPlatform: input.providerPlatform,
    recordCount: input.records.length,
    reactivationTargets,
    referralOpportunities,
    giftOpportunities,
    trustedProviderIntroOpportunities,
    estimatedRecoverableRevenue,
    generatedAt: new Date().toISOString(),
  };
}
