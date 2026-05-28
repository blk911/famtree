// lib/studios/styleseat/market-clusters.ts
// Clusters market intelligence into beauty creator ecosystem types.

import type { StyleSeatMarketCluster, StyleSeatMarketIntelligence } from "./types";

function ecosystemType(market: StyleSeatMarketIntelligence): string {
  const cats = Object.entries(market.categoryCounts)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .map(([category]) => category);

  if (cats.some((c) => ["braids", "locs", "hair"].includes(c)) && market.marketScore >= 70) {
    return "Multicultural Creator Dense";
  }
  if (cats.some((c) => ["lashes", "brows", "makeup"].includes(c))) {
    return "Glam And Aesthetics Cluster";
  }
  if (cats.some((c) => ["nails", "extensions"].includes(c))) {
    return "Premium Services Cluster";
  }
  if (market.mobileOperatorPercent >= 20) {
    return "Mobile Operator Network";
  }
  return market.marketScore >= 60 ? "Independent Beauty Growth Market" : "Early Signal Market";
}

export function buildMarketClusters(markets: StyleSeatMarketIntelligence[]): StyleSeatMarketCluster[] {
  return markets.map((market) => {
    const dominantCategories = Object.entries(market.categoryCounts)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
      .slice(0, 4)
      .map(([category]) => category);
    const signals = [
      `${market.operatorCount} operators`,
      `${market.activeIGPercent}% IG active`,
      `${market.avgReviewCount} avg reviews`,
      market.mobileOperatorPercent > 0 ? `${market.mobileOperatorPercent}% mobile indicators` : "",
      market.suiteOperatorPercent > 0 ? `${market.suiteOperatorPercent}% suite/studio indicators` : "",
    ].filter(Boolean);

    return {
      market: market.market,
      dominantCategories,
      ecosystemType: ecosystemType(market),
      operatorCount: market.operatorCount,
      avgSocialSignal: market.activeIGPercent,
      score: market.marketScore,
      signals,
    };
  }).sort((a, b) => b.score - a.score);
}
