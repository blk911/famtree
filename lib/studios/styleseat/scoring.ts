// lib/studios/styleseat/scoring.ts
// Deterministic scoring helpers for StyleSeat market intelligence.

import type {
  StyleSeatCategory,
  StyleSeatCategoryIntelligence,
  StyleSeatMarketIntelligence,
  StyleSeatOperator,
  StyleSeatOperatorLabel,
  StyleSeatOperatorScore,
  StyleSeatResolverResult,
} from "./types";

const PREMIUM_KEYWORDS = ["bridal", "balayage", "color correction", "extensions", "luxury", "suite", "studio", "master", "certified"];
const CREATOR_KEYWORDS = ["ig", "instagram", "content", "brand", "educator", "portfolio", "book", "dm", "link"];
const MOBILE_KEYWORDS = ["mobile", "travel", "house call", "on location", "home service"];
const SUITE_KEYWORDS = ["suite", "salon suite", "studio", "loft", "private room"];

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export function textForOperator(operator: StyleSeatOperator): string {
  return [
    operator.name,
    operator.bio,
    operator.rawText,
    ...operator.specialties,
    ...operator.services.map((s) => s.name),
  ].filter(Boolean).join(" ").toLowerCase();
}

export function scoreResolverConfidence(result: StyleSeatResolverResult | null | undefined): number {
  if (!result) return 0;
  const savedBoost = result.prospectId ? 12 : 0;
  const resolvedBoost = result.resolved ? 10 : 0;
  return clamp(result.igConfidence + savedBoost + resolvedBoost);
}

export function scoreOperator(operator: StyleSeatOperator, result?: StyleSeatResolverResult): StyleSeatOperatorScore {
  const text = textForOperator(operator);
  const reviewScore = Math.min(25, Math.log10(Math.max(operator.reviewCount, 0) + 1) * 14);
  const imageScore = Math.min(12, (operator.imageCount ?? (operator.imageUrl ? 1 : 0)) * 2);
  const resolverScore = scoreResolverConfidence(result) * 0.25;
  const completenessScore = [
    operator.bio,
    operator.city,
    operator.state,
    operator.services.length > 0,
    operator.specialties.length > 0,
    operator.rating,
  ].filter(Boolean).length * 4;
  const premiumScore = PREMIUM_KEYWORDS.filter((kw) => text.includes(kw)).length * 5;
  const creatorScore = CREATOR_KEYWORDS.filter((kw) => text.includes(kw)).length * 4;

  const score = clamp(reviewScore + imageScore + resolverScore + completenessScore + premiumScore + creatorScore + 10);
  const labels: StyleSeatOperatorLabel[] = [];
  const signals: string[] = [];

  if (score >= 70) labels.push("creator_candidate");
  if (premiumScore >= 10 || operator.reviewCount >= 35) labels.push("premium_operator");
  if ((result?.igConfidence ?? 0) >= 55) labels.push("high_social_signal");
  if (operator.isIndependent || text.includes("studio") || text.includes("brand")) labels.push("independent_brand");
  if (SUITE_KEYWORDS.some((kw) => text.includes(kw))) labels.push("likely_suite_renter");
  if (MOBILE_KEYWORDS.some((kw) => text.includes(kw))) labels.push("likely_mobile");
  if (score >= 45 && score < 70) labels.push("emerging_creator");

  if (operator.reviewCount > 0) signals.push(`${operator.reviewCount} reviews`);
  if ((operator.imageCount ?? 0) > 0) signals.push(`${operator.imageCount} images`);
  if (result?.igHandleFound) signals.push(`IG candidate @${result.igHandleFound}`);
  for (const keyword of [...PREMIUM_KEYWORDS, ...CREATOR_KEYWORDS, ...MOBILE_KEYWORDS, ...SUITE_KEYWORDS]) {
    if (text.includes(keyword)) signals.push(keyword);
  }

  return {
    operatorId: operator.styleseatId,
    name: operator.name,
    city: operator.city,
    state: operator.state,
    market: [operator.city, operator.state].filter(Boolean).join(", ") || "Unknown",
    categories: operator.categories,
    specialties: operator.specialties,
    score,
    resolverConfidence: scoreResolverConfidence(result),
    labels: Array.from(new Set(labels)),
    signals: Array.from(new Set(signals)).slice(0, 12),
    igHandleFound: result?.igHandleFound ?? null,
    prospectId: result?.prospectId ?? null,
  };
}

export function scoreMarket(input: {
  operatorCount: number;
  activeIGPercent: number;
  avgReviewCount: number;
  specialtyDiversity: number;
  premiumPercent: number;
  suitePercent: number;
}): number {
  return clamp(
    Math.min(25, input.operatorCount * 3) +
    input.activeIGPercent * 0.25 +
    Math.min(20, input.avgReviewCount * 0.6) +
    Math.min(15, input.specialtyDiversity * 3) +
    input.premiumPercent * 0.15 +
    input.suitePercent * 0.1
  );
}

export function scoreCategory(category: StyleSeatCategoryIntelligence): number {
  return clamp(
    Math.min(35, category.count * 4) +
    category.IGActivePercent * 0.3 +
    Math.min(20, category.avgReviews * 0.5) +
    Math.min(15, category.topMarkets.length * 4)
  );
}

export function marketSummary(market: StyleSeatMarketIntelligence): string {
  if (market.marketScore >= 85) return "Extremely strong multicultural creator ecosystem";
  if (market.marketScore >= 70) return "High independent operator density";
  if (market.marketScore >= 55) return "Emerging creator ecosystem with focused follow-up potential";
  return "Early signal market that needs deeper crawl coverage";
}

export function percent(part: number, total: number): number {
  return pct(part, total);
}
