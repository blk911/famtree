// lib/intelligence/transpo/data-confidence/data-confidence-summary.ts

import type { TranspoServiceDeficitRecord } from "../service-deficits/deficit-types";
import type {
  TranspoDataConfidenceQuestion,
  TranspoDataConfidenceRecord,
  TranspoDataConfidenceSummary,
} from "./data-confidence-types";

export function buildTranspoDataConfidenceSummary(
  records: TranspoDataConfidenceRecord[],
): TranspoDataConfidenceSummary {
  const high = records.filter((r) => r.confidenceGrade === "high").length;
  const medium = records.filter((r) => r.confidenceGrade === "medium").length;
  const low = records.filter((r) => r.confidenceGrade === "low").length;
  const experimental = records.filter((r) => r.confidenceGrade === "experimental").length;

  const avg =
    records.length > 0
      ? Math.round(records.reduce((s, r) => s + r.confidenceScore, 0) / records.length)
      : 0;

  const topActionable = [...records]
    .filter((r) => r.confidenceGrade === "high" || r.confidenceGrade === "medium")
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 8);

  const topWeak = [...records]
    .filter((r) => r.confidenceGrade === "low" || r.confidenceGrade === "experimental")
    .sort((a, b) => a.confidenceScore - b.confidenceScore)
    .slice(0, 8);

  return {
    totalRecords: records.length,
    high,
    medium,
    low,
    experimental,
    liveCarrierSupply: records.filter((r) => r.carrierSupplyStatus === "live").length,
    liveVerification: records.filter((r) => r.verificationStatus === "live").length,
    livePayers: records.filter((r) => r.payerStatus === "live").length,
    seededDemand: records.filter((r) => r.demandStatus === "seeded").length,
    seededPayers: records.filter((r) => r.payerStatus === "seeded").length,
    missingPayers: records.filter((r) => r.payerStatus === "missing").length,
    missingDemandOrPayer: records.filter(
      (r) => r.demandStatus === "missing" || r.payerStatus === "missing",
    ).length,
    averageConfidenceScore: avg,
    topActionable,
    topWeak,
  };
}

export function buildTranspoDataConfidenceQuestions(
  records: TranspoDataConfidenceRecord[],
  summary: TranspoDataConfidenceSummary,
  deficits: TranspoServiceDeficitRecord[],
): TranspoDataConfidenceQuestion[] {
  const highConf = records.filter((r) => r.confidenceGrade === "high").length;
  const experimental = summary.experimental;

  const seededDemandHeavy = records.filter(
    (r) => r.demandStatus === "seeded" && r.seededSignals.some((s) => s.toLowerCase().includes("census")),
  ).length;

  const heuristicPayerRevenue = records.filter(
    (r) =>
      (r.payerStatus === "seeded" || r.payerStatus === "heuristic") &&
      r.revenueStatus === "heuristic",
  ).length;

  const liveSupplyWeakDemand = records.filter(
    (r) =>
      r.carrierSupplyStatus === "live" &&
      (r.demandStatus !== "live" || r.payerStatus !== "live"),
  );

  const nextSourceCounts = new Map<string, number>();
  for (const r of records) {
    if (!r.recommendedNextDataSource) continue;
    nextSourceCounts.set(
      r.recommendedNextDataSource,
      (nextSourceCounts.get(r.recommendedNextDataSource) ?? 0) + 1,
    );
  }
  const topNextSource = Array.from(nextSourceCounts.entries()).sort((a, b) => b[1] - a[1])[0];

  const deficitByKey = new Map(
    deficits.map((d) => [`${d.state}|${d.county}|${d.serviceCategory}`, d]),
  );

  const actionableNow = records.filter((r) => {
    const d = deficitByKey.get(`${r.state}|${r.county ?? ""}|${r.serviceCategory ?? ""}`);
    if (!d) return false;
    const sevOk = d.severity === "high" || d.severity === "critical";
    const revOk =
      d.revenueOpportunity.revenuePotential === "high" ||
      d.revenueOpportunity.revenuePotential === "strategic";
    const confOk = r.confidenceGrade === "high" || r.confidenceGrade === "medium";
    return sevOk && revOk && confOk;
  });

  const needsValidation = records.filter((r) => {
    const d = deficitByKey.get(`${r.state}|${r.county ?? ""}|${r.serviceCategory ?? ""}`);
    if (!d) return false;
    const sevOk = d.severity === "high" || d.severity === "critical";
    const confWeak = r.confidenceGrade === "low" || r.confidenceGrade === "experimental";
    return sevOk && confWeak;
  });

  return [
    {
      id: "Q1",
      question: "How many deficit records are high confidence?",
      answer: `${highConf} of ${records.length} confidence records are high grade (score ≥ 80).`,
    },
    {
      id: "Q2",
      question: "How many are experimental?",
      answer: `${experimental} records are experimental grade (score < 40).`,
    },
    {
      id: "Q3",
      question: "Which records rely mostly on seeded demand?",
      answer: `${seededDemandHeavy} records use seeded Colorado county census demand (not live ACS).`,
    },
    {
      id: "Q4",
      question: "Which records rely mostly on heuristic payer/revenue estimates?",
      answer: `${heuristicPayerRevenue} records combine seeded/heuristic payers with v1 revenue formula.`,
    },
    {
      id: "Q5",
      question: "Where is carrier supply live but demand/payer data weak?",
      answer:
        liveSupplyWeakDemand.length > 0
          ? `${liveSupplyWeakDemand.length} markets: ${liveSupplyWeakDemand
              .slice(0, 5)
              .map((r) => `${r.county ?? r.state} ${r.serviceCategory ?? ""}`.trim())
              .join("; ")}${liveSupplyWeakDemand.length > 5 ? "…" : ""}`
          : "No markets with live carrier supply and weak demand/payer in the current cache.",
    },
    {
      id: "Q6",
      question: "Which dataset would most improve confidence?",
      answer: topNextSource
        ? `"${topNextSource[0]}" would improve ${topNextSource[1]} record(s).`
        : "All layers are live — no single dataset dominates improvement.",
    },
    {
      id: "Q7",
      question: "Which counties are actionable now?",
      answer:
        actionableNow.length > 0
          ? `${actionableNow.length} markets: ${actionableNow
              .slice(0, 6)
              .map((r) => `${r.county}, ${r.state}`)
              .join("; ")}`
          : "None yet — need medium+ confidence with high/critical deficit and high/strategic revenue.",
    },
    {
      id: "Q8",
      question: "Which counties require data validation before action?",
      answer:
        needsValidation.length > 0
          ? `${needsValidation.length} high-severity markets with low/experimental confidence: ${needsValidation
              .slice(0, 6)
              .map((r) => `${r.county}, ${r.state}`)
              .join("; ")}`
          : "No high-severity deficits flagged with low confidence.",
    },
  ];
}
