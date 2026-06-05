// lib/intelligence/transpo/service-deficits/deficit-summary.ts

import { SERVICE_CATEGORY_LABELS, type TranspoServiceCategory } from "../market-gaps/types";
import type { TranspoServiceDeficitQuestion, TranspoServiceDeficitRecord, TranspoServiceDeficitSummary } from "./deficit-types";

function severityCounts(records: TranspoServiceDeficitRecord[]) {
  return {
    critical: records.filter((r) => r.severity === "critical").length,
    high: records.filter((r) => r.severity === "high").length,
    medium: records.filter((r) => r.severity === "medium").length,
    low: records.filter((r) => r.severity === "low").length,
  };
}

export function buildTranspoServiceDeficitSummary(
  records: TranspoServiceDeficitRecord[],
): TranspoServiceDeficitSummary {
  const counts = severityCounts(records);
  const categories = Object.keys(SERVICE_CATEGORY_LABELS) as TranspoServiceCategory[];

  return {
    totalDeficits: records.length,
    ...counts,
    averageDeficitScore: records.length
      ? Math.round(records.reduce((s, r) => s + r.deficitScore, 0) / records.length)
      : 0,
    topDeficits: [...records].sort((a, b) => b.deficitScore - a.deficitScore).slice(0, 10),
    topRevenueOpportunities: [...records]
      .sort((a, b) => b.revenueOpportunity.opportunityScore - a.revenueOpportunity.opportunityScore)
      .slice(0, 10),
    byServiceCategory: categories.map((serviceCategory) => {
      const subset = records.filter((r) => r.serviceCategory === serviceCategory);
      const c = severityCounts(subset);
      return {
        serviceCategory,
        total: subset.length,
        critical: c.critical,
        high: c.high,
        averageDeficitScore: subset.length
          ? Math.round(subset.reduce((s, r) => s + r.deficitScore, 0) / subset.length)
          : 0,
      };
    }).filter((r) => r.total > 0),
  };
}

export function buildTranspoServiceDeficitQuestions(
  records: TranspoServiceDeficitRecord[],
  summary: TranspoServiceDeficitSummary,
): TranspoServiceDeficitQuestion[] {
  const topCounty = summary.topDeficits[0];
  const topCategory = [...summary.byServiceCategory].sort(
    (a, b) => b.critical + b.high - (a.critical + a.high) || b.averageDeficitScore - a.averageDeficitScore,
  )[0];

  const payerWeakCoverage = records
    .filter((r) => r.payerPresenceScore >= 40 && r.coverageScore < 25)
    .slice(0, 3);

  const pickCategory = (cat: TranspoServiceCategory) =>
    records
      .filter((r) => r.serviceCategory === cat && (r.severity === "high" || r.severity === "critical"))
      .slice(0, 2)
      .map((r) => `${r.marketLabel} (deficit ${r.deficitScore})`)
      .join("; ") || "None in current cache.";

  const topRevenue = summary.topRevenueOpportunities.slice(0, 3);
  const investigate = records.filter((r) => r.severity === "critical").slice(0, 5);

  return [
    {
      id: "Q1",
      question: "Which counties have the highest service deficit?",
      answer: topCounty
        ? `${topCounty.marketLabel} (deficit ${topCounty.deficitScore}, ${topCounty.severity}).`
        : "Run backfill after carrier master has data.",
    },
    {
      id: "Q2",
      question: "Which service category has the largest deficit?",
      answer: topCategory
        ? `${SERVICE_CATEGORY_LABELS[topCategory.serviceCategory]} — ${topCategory.critical} critical, ${topCategory.high} high (avg deficit ${topCategory.averageDeficitScore}).`
        : "No category breakdown yet.",
    },
    {
      id: "Q3",
      question: "Which counties have payer presence but weak provider coverage?",
      answer: payerWeakCoverage.length
        ? payerWeakCoverage.map((r) => `${r.marketLabel} (payer ${r.payerPresenceScore}, coverage ${r.coverageScore})`).join("; ")
        : "None detected.",
    },
    { id: "Q4", question: "Where are NEMT opportunities strongest?", answer: pickCategory("nemt") },
    { id: "Q5", question: "Where are meal delivery opportunities strongest?", answer: pickCategory("meal_delivery") },
    { id: "Q6", question: "Where are senior transportation opportunities strongest?", answer: pickCategory("senior_transport") },
    { id: "Q7", question: "Where are veteran transportation opportunities strongest?", answer: pickCategory("veteran_transport") },
    {
      id: "Q8",
      question: "What deficit categories have the highest estimated revenue potential?",
      answer: topRevenue.length
        ? topRevenue.map((r) => `${r.marketLabel} — ${r.revenueOpportunity.revenuePotential} (${r.revenueOpportunity.opportunityScore})`).join(" | ")
        : "Run backfill to compute revenue opportunities.",
    },
    {
      id: "Q9",
      question: "What counties should be investigated first?",
      answer: investigate.length
        ? investigate.map((r) => `${r.marketLabel}: ${r.revenueOpportunity.recommendedPlay}`).join(" | ")
        : "Prioritize critical deficits after backfill.",
    },
    {
      id: "Q10",
      question: "Which additional datasets would most improve confidence?",
      answer:
        "Live US Census ACS county demographics, state Medicaid NEMT broker regions, USDA RUCA rurality codes, Area Agency on Aging directories, VA facility catchment maps, and food-access (USDA Food Access Research Atlas).",
    },
  ];
}
