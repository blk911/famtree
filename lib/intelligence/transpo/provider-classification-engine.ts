// lib/intelligence/transpo/provider-classification-engine.ts
// Provider service-category classification (extends carrier master; read-only).

import type { TranspoCarrierTarget } from "./types";
import type { TranspoCarrierVerification } from "./verification-types";
import type { TranspoServiceCategory } from "./market-gaps/types";

const CATEGORY_RULES: { category: TranspoServiceCategory; patterns: RegExp[] }[] = [
  {
    category: "nemt",
    patterns: [
      /\bnemt\b/i,
      /non[- ]?emergency/i,
      /medicaid ride/i,
      /patient transport/i,
      /wheelchair/i,
      /stretcher/i,
    ],
  },
  {
    category: "medical_transport",
    patterns: [/\bmedical\b/i, /\bambulance\b/i, /\bpatient\b/i, /\bclinic\b/i, /\bhospital\b/i],
  },
  {
    category: "senior_transport",
    patterns: [/\bsenior\b/i, /\belder\b/i, /assisted living/i, /\bretirement\b/i],
  },
  {
    category: "veteran_transport",
    patterns: [/\bveteran/i, /\bva\b/i, /\bmilitary\b/i],
  },
  {
    category: "meal_delivery",
    patterns: [/\bmeal/i, /\bmeals\b/i, /food delivery/i, /\bnutrition\b/i, /senior meals/i],
  },
  {
    category: "rural_transit",
    patterns: [/\brural\b/i, /county transit/i, /community transit/i],
  },
];

function normalizeText(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function collectProviderClassificationText(
  carrier: TranspoCarrierTarget,
  verification?: TranspoCarrierVerification,
): string {
  const googleCategory = verification?.googleCategory ?? "";
  const websiteSignals = (verification?.websiteSignals ?? []).join(" ");
  return normalizeText(
    carrier.companyName,
    carrier.website,
    verification?.websiteTitle,
    verification?.websiteDescription,
    googleCategory,
    websiteSignals,
    ...(verification?.notes ?? []),
  );
}

export function classifyProviderServiceCategory(
  carrier: TranspoCarrierTarget,
  verification?: TranspoCarrierVerification,
): TranspoServiceCategory {
  const text = collectProviderClassificationText(carrier, verification);
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((p) => p.test(text))) return rule.category;
  }
  return "general_carrier";
}

export function classifyProviderWithSignals(
  carrier: TranspoCarrierTarget,
  verification?: TranspoCarrierVerification,
): { category: TranspoServiceCategory; signals: string[] } {
  const text = collectProviderClassificationText(carrier, verification);
  const signals: string[] = [];
  for (const rule of CATEGORY_RULES) {
    const hit = rule.patterns.find((p) => p.test(text));
    if (hit) signals.push(`name/web match: ${rule.category}`);
  }
  if (verification?.websiteHiringFound) signals.push("website: hiring");
  if (verification?.googleFound) signals.push("google: business found");
  const category = signals.length > 0
    ? CATEGORY_RULES.find((r) => signals[0]?.includes(r.category))?.category ?? "general_carrier"
    : classifyProviderServiceCategory(carrier, verification);
  return { category, signals };
}
