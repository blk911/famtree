// lib/studios/styleseat/intelligence.ts
// Builds deterministic intelligence summaries from StyleSeat run artifacts.

import type {
  StyleSeatCategory,
  StyleSeatCategoryIntelligence,
  StyleSeatIntelligenceReport,
  StyleSeatMarketIntelligence,
  StyleSeatOperator,
  StyleSeatResolverResult,
  StyleSeatRunFile,
} from "./types";
import { buildMarketClusters } from "./market-clusters";
import { marketSummary, percent, scoreCategory, scoreMarket, scoreOperator, textForOperator } from "./scoring";

const CATEGORIES: StyleSeatCategory[] = ["hair", "braids", "barber", "locs", "makeup", "lashes", "brows", "nails", "extensions"];
const SERVICE_KEYWORDS = [
  "silk press", "balayage", "braids", "locs", "bridal", "barber", "color correction", "extensions",
  "lashes", "brow", "men's grooming", "natural hair", "multicultural", "mobile", "suite", "studio",
];

function inc(map: Record<string, number>, key: string, by = 1): void {
  map[key] = (map[key] ?? 0) + by;
}

function topKeys(map: Record<string, number>, limit = 5): string[] {
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([key]) => key);
}

function marketKey(operator: StyleSeatOperator): string {
  return [operator.city, operator.state].filter(Boolean).join(", ") || "Unknown";
}

function findResolver(operator: StyleSeatOperator, results: StyleSeatResolverResult[]): StyleSeatResolverResult | undefined {
  return results.find((result) =>
    result.operator.styleseatId === operator.styleseatId ||
    result.operator.styleseatUrl === operator.styleseatUrl ||
    result.operator.slug === operator.slug
  );
}

function buildMarketAnalysis(operators: StyleSeatOperator[], results: StyleSeatResolverResult[]): StyleSeatMarketIntelligence[] {
  const groups = new Map<string, StyleSeatOperator[]>();
  for (const operator of operators) {
    const key = marketKey(operator);
    groups.set(key, [...(groups.get(key) ?? []), operator]);
  }

  return Array.from(groups.entries()).map(([market, items]) => {
    const categoryCounts: Partial<Record<StyleSeatCategory, number>> = {};
    const specialtyCounts: Record<string, number> = {};
    const serviceCounts: Record<string, number> = {};
    let activeIg = 0;
    let unresolved = 0;
    let reviewTotal = 0;
    let imageTotal = 0;
    let mobile = 0;
    let suite = 0;
    let premium = 0;

    for (const operator of items) {
      const text = textForOperator(operator);
      const resolver = findResolver(operator, results);
      if (resolver?.igHandleFound) activeIg++;
      if (!resolver?.prospectId) unresolved++;
      reviewTotal += operator.reviewCount;
      imageTotal += operator.imageCount ?? (operator.imageUrl ? 1 : 0);
      if (text.includes("mobile") || text.includes("travel") || text.includes("house call")) mobile++;
      if (text.includes("suite") || text.includes("studio") || text.includes("loft")) suite++;
      if (text.includes("bridal") || text.includes("balayage") || text.includes("extensions") || operator.reviewCount >= 35) premium++;
      for (const category of operator.categories) categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
      for (const specialty of operator.specialties) inc(specialtyCounts, specialty.toLowerCase());
      for (const keyword of SERVICE_KEYWORDS) if (text.includes(keyword)) inc(serviceCounts, keyword);
    }

    const cityState = market.split(",").map((part) => part.trim());
    const activeIGPercent = percent(activeIg, items.length);
    const marketScore = scoreMarket({
      operatorCount: items.length,
      activeIGPercent,
      avgReviewCount: Math.round(reviewTotal / Math.max(1, items.length)),
      specialtyDiversity: Object.keys(specialtyCounts).length,
      premiumPercent: percent(premium, items.length),
      suitePercent: percent(suite, items.length),
    });

    const analysis: StyleSeatMarketIntelligence = {
      market,
      city: cityState[0] ?? "Unknown",
      state: cityState[1] ?? "",
      operatorCount: items.length,
      categoryCounts,
      topSpecialties: topKeys(specialtyCounts),
      topServiceKeywords: topKeys(serviceCounts),
      activeIGPercent,
      avgReviewCount: Math.round(reviewTotal / Math.max(1, items.length)),
      avgImageCount: Math.round(imageTotal / Math.max(1, items.length)),
      mobileOperatorPercent: percent(mobile, items.length),
      suiteOperatorPercent: percent(suite, items.length),
      unresolvedPercent: percent(unresolved, items.length),
      marketScore,
      summary: "",
    };
    analysis.summary = marketSummary(analysis);
    return analysis;
  }).sort((a, b) => b.marketScore - a.marketScore);
}

function buildCategoryAnalysis(operators: StyleSeatOperator[], results: StyleSeatResolverResult[]): StyleSeatCategoryIntelligence[] {
  return CATEGORIES.map((category) => {
    const items = operators.filter((operator) => operator.categories.includes(category));
    const marketDistribution: Record<string, number> = {};
    let activeIg = 0;
    let reviews = 0;
    for (const operator of items) {
      inc(marketDistribution, marketKey(operator));
      if (findResolver(operator, results)?.igHandleFound) activeIg++;
      reviews += operator.reviewCount;
    }
    const growthSignals = [
      items.some((op) => textForOperator(op).includes("mobile")) ? "mobile operator signal" : "",
      items.some((op) => textForOperator(op).includes("suite")) ? "suite renter signal" : "",
      items.some((op) => op.reviewCount >= 35) ? "premium review density" : "",
      items.length >= 5 ? "visible category density" : "",
    ].filter(Boolean);
    const analysis: StyleSeatCategoryIntelligence = {
      category,
      count: items.length,
      marketDistribution,
      IGActivePercent: percent(activeIg, items.length),
      avgReviews: Math.round(reviews / Math.max(1, items.length)),
      topMarkets: topKeys(marketDistribution, 4),
      growthSignals,
      score: 0,
    };
    analysis.score = scoreCategory(analysis);
    return analysis;
  }).filter((category) => category.count > 0).sort((a, b) => b.score - a.score);
}

function buildInsights(report: Omit<StyleSeatIntelligenceReport, "insights" | "recommendations">): string[] {
  const insights: string[] = [];
  for (const market of report.markets.slice(0, 5)) {
    const topCats = Object.entries(market.categoryCounts).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).slice(0, 3).map(([cat]) => cat).join(", ");
    insights.push(`${market.market} shows ${topCats || "beauty"} specialization density with a market score of ${market.marketScore}.`);
    if (market.mobileOperatorPercent >= 20) insights.push(`${market.market} operators show elevated mobile stylist indicators.`);
    if (market.unresolvedPercent >= 40) insights.push(`${market.market} has a high unresolved rate and needs deeper identity resolution.`);
  }
  const topCategory = report.categories[0];
  if (topCategory) insights.push(`${topCategory.category} is the strongest visible category across ${topCategory.topMarkets.join(", ") || "the run"}.`);
  return Array.from(new Set(insights)).slice(0, 10);
}

function buildRecommendations(report: Omit<StyleSeatIntelligenceReport, "insights" | "recommendations">): string[] {
  const recommendations: string[] = [];
  for (const market of report.markets.slice(0, 5)) {
    const dominant = Object.entries(market.categoryCounts).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] ?? "beauty";
    if (market.marketScore >= 75) recommendations.push(`Run deeper crawl in ${market.market} ${dominant} category.`);
    if (market.unresolvedPercent >= 35) recommendations.push(`${market.market} ${dominant} ecosystem is under-resolved; run deep resolver mode.`);
    if (market.activeIGPercent < 35) recommendations.push(`${market.market} operators have low social linkage; prioritize direct profile URL harvests.`);
    if (market.avgReviewCount >= 25) recommendations.push(`High premium creator density detected in ${market.market}.`);
  }
  if (recommendations.length === 0) recommendations.push("Run a larger aggregator crawl to increase market density confidence.");
  return Array.from(new Set(recommendations)).slice(0, 10);
}

export function buildStyleSeatIntelligenceReport(runData: StyleSeatRunFile): StyleSeatIntelligenceReport {
  const operators = runData.operators;
  const results = runData.results ?? [];
  const operatorScores = operators
    .map((operator) => scoreOperator(operator, findResolver(operator, results)))
    .sort((a, b) => b.score - a.score);
  const markets = buildMarketAnalysis(operators, results);
  const categories = buildCategoryAnalysis(operators, results);
  const clusters = buildMarketClusters(markets);
  const base = {
    runId: runData.run.runId,
    createdAt: new Date().toISOString(),
    markets,
    categories,
    operators: operatorScores,
    clusters,
  };
  return {
    ...base,
    insights: buildInsights(base),
    recommendations: buildRecommendations(base),
  };
}
