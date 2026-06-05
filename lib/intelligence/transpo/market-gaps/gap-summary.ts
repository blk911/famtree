// lib/intelligence/transpo/market-gaps/gap-summary.ts

import { SERVICE_CATEGORY_LABELS, type TranspoMarketGapQuestion, type TranspoMarketGapRecord, type TranspoMarketGapSummary, type TranspoServiceCategory } from "./types";

function severityCounts(records: TranspoMarketGapRecord[]) {
  return {
    critical: records.filter((r) => r.severity === "critical").length,
    high: records.filter((r) => r.severity === "high").length,
    medium: records.filter((r) => r.severity === "medium").length,
    low: records.filter((r) => r.severity === "low").length,
  };
}

export function buildTranspoMarketGapSummary(records: TranspoMarketGapRecord[]): TranspoMarketGapSummary {
  const counts = severityCounts(records);
  const averageGapScore = records.length
    ? Math.round(records.reduce((s, r) => s + r.gapScore, 0) / records.length)
    : 0;

  const categories = Object.keys(SERVICE_CATEGORY_LABELS) as TranspoServiceCategory[];
  const byServiceCategory = categories.map((serviceCategory) => {
    const subset = records.filter((r) => r.serviceCategory === serviceCategory);
    const c = severityCounts(subset);
    return {
      serviceCategory,
      totalMarkets: subset.length,
      ...c,
      averageGapScore: subset.length
        ? Math.round(subset.reduce((s, r) => s + r.gapScore, 0) / subset.length)
        : 0,
    };
  }).filter((row) => row.totalMarkets > 0);

  return {
    totalMarkets: records.length,
    ...counts,
    averageGapScore,
    byServiceCategory,
    topGaps: [...records].sort((a, b) => b.gapScore - a.gapScore).slice(0, 10),
  };
}

export function buildTranspoMarketGapQuestions(
  records: TranspoMarketGapRecord[],
  summary: TranspoMarketGapSummary,
): TranspoMarketGapQuestion[] {
  const top = summary.topGaps[0];
  const topCategory = [...summary.byServiceCategory].sort(
    (a, b) => b.critical + b.high - (a.critical + a.high) || b.averageGapScore - a.averageGapScore,
  )[0];

  const supplyWeakVerification = records
    .filter((r) => r.carrierCount >= 3 && r.verifiedCarrierCount === 0)
    .sort((a, b) => b.carrierCount - a.carrierCount)
    .slice(0, 3);

  const nemtThin = records
    .filter((r) =>
      (r.serviceCategory === "nemt" || r.serviceCategory === "medical_transport") &&
      (r.severity === "high" || r.severity === "critical"),
    )
    .slice(0, 3);

  const investigateFirst = records
    .filter((r) => r.severity === "critical" || r.severity === "high")
    .slice(0, 5);

  const dataLimited = records.filter((r) =>
    r.evidence.some((e) => e.includes("v1 heuristic")),
  ).length;

  const playCounts = new Map<string, number>();
  for (const r of records) {
    playCounts.set(r.recommendedPlay, (playCounts.get(r.recommendedPlay) ?? 0) + 1);
  }
  const topPlay = Array.from(playCounts.entries()).sort((a, b) => b[1] - a[1])[0];

  return [
    {
      id: "Q1",
      question: "Which markets have the highest gap scores?",
      answer: top
        ? `${top.marketLabel} (gap ${top.gapScore}, ${top.severity}) leads the set. Top 3: ${summary.topGaps
            .slice(0, 3)
            .map((r) => `${r.marketLabel} (${r.gapScore})`)
            .join("; ")}.`
        : "No gap records yet — run Market Gap Backfill after carrier master has data.",
    },
    {
      id: "Q2",
      question: "Which service category has the most critical gaps?",
      answer: topCategory
        ? `${SERVICE_CATEGORY_LABELS[topCategory.serviceCategory]} — ${topCategory.critical} critical, ${topCategory.high} high across ${topCategory.totalMarkets} markets (avg gap ${topCategory.averageGapScore}).`
        : "No category breakdown available yet.",
    },
    {
      id: "Q3",
      question: "Which counties/cities have supply but weak verification?",
      answer: supplyWeakVerification.length
        ? supplyWeakVerification
            .map((r) => `${r.marketLabel} (${r.carrierCount} carriers, 0 verified)`)
            .join("; ")
        : "No markets with meaningful supply and zero verified carriers detected.",
    },
    {
      id: "Q4",
      question: "Where are NEMT or medical transport signals thin?",
      answer: nemtThin.length
        ? nemtThin.map((r) => `${r.marketLabel} (${r.carrierCount} carriers, gap ${r.gapScore})`).join("; ")
        : "No high/critical NEMT or medical transport gaps in current cache.",
    },
    {
      id: "Q5",
      question: "Which markets should be investigated first?",
      answer: investigateFirst.length
        ? investigateFirst.map((r) => `${r.marketLabel} — ${r.recommendedPlay}`).join(" | ")
        : "Run backfill after ingesting carriers; prioritize critical/high severity markets.",
    },
    {
      id: "Q6",
      question: "Which gaps are data-limited and need external demand datasets?",
      answer: `${dataLimited} of ${records.length} records use v1 demand heuristics only. Population, Medicaid, senior share, veteran share, and food-access scores are not connected yet.`,
    },
    {
      id: "Q7",
      question: "Which recommended plays appear most often?",
      answer: topPlay
        ? `"${topPlay[0]}" appears ${topPlay[1]} time${topPlay[1] === 1 ? "" : "s"} across markets.`
        : "No recommended plays generated yet.",
    },
    {
      id: "Q8",
      question: "What is the next data source needed?",
      answer:
        "County-level population + Medicaid enrollment + senior/veteran share datasets, plus NEMT/medical trip demand proxies to replace v1 rurality heuristics.",
    },
  ];
}
