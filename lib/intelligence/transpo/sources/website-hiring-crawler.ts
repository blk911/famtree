// lib/intelligence/transpo/sources/website-hiring-crawler.ts
// Website hiring-signal scanner. Detects driver-hiring / careers signals in
// provided page text. Does NOT fetch external sites — callers pass pageText.
// Fails gracefully when there's no text to scan.

import type { TranspoEvidence } from "../types";

export type WebsiteHiringInput = {
  website?: string;
  companyName?: string;
  /** Optional raw page text / HTML to scan. No live fetching is performed. */
  pageText?: string;
};

export type WebsiteHiringResult = {
  ok: boolean;
  source: "website";
  sourceMode: "manual" | "unknown";
  evidence: TranspoEvidence[];
  signals: string[];
  message?: string;
};

type HiringTerm = {
  phrase: string;
  evidenceType: Extract<TranspoEvidence["evidenceType"], "hiring" | "website">;
};

const HIRING_TERMS: HiringTerm[] = [
  { phrase: "hiring", evidenceType: "hiring" },
  { phrase: "drivers wanted", evidenceType: "hiring" },
  { phrase: "owner operators", evidenceType: "hiring" },
  { phrase: "apply now", evidenceType: "website" },
  { phrase: "careers", evidenceType: "website" },
  { phrase: "CDL", evidenceType: "hiring" },
  { phrase: "lease purchase", evidenceType: "hiring" },
  { phrase: "dedicated lanes", evidenceType: "hiring" },
  { phrase: "regional drivers", evidenceType: "hiring" },
];

function carrierKeyFor(input: WebsiteHiringInput): string {
  if (input.website) {
    return `web:${input.website.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/g, "-")}`;
  }
  if (input.companyName) {
    return `name:${input.companyName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  }
  return "unknown";
}

export async function crawlWebsiteHiringSignals(
  input: WebsiteHiringInput,
): Promise<WebsiteHiringResult> {
  const website = (input.website ?? "").trim();
  const pageText = (input.pageText ?? "").trim();

  if (!website && !pageText) {
    return {
      ok: false,
      source: "website",
      sourceMode: "unknown",
      evidence: [],
      signals: [],
      message: "Provide a website or pageText to scan for hiring signals.",
    };
  }

  if (!pageText) {
    return {
      ok: false,
      source: "website",
      sourceMode: "unknown",
      evidence: [],
      signals: [],
      message:
        "Live website crawling is not enabled yet — pass pageText to scan for hiring signals.",
    };
  }

  const carrierKey = carrierKeyFor(input);
  const observedAt = new Date().toISOString();
  const confidence = 0.7;
  const haystack = pageText.toLowerCase();

  const evidence: TranspoEvidence[] = [];
  const signals: string[] = [];

  for (const term of HIRING_TERMS) {
    if (haystack.includes(term.phrase.toLowerCase())) {
      signals.push(term.phrase);
      evidence.push({
        id: `website-${term.evidenceType}-${term.phrase.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
        carrierKey,
        source: "website",
        evidenceType: term.evidenceType,
        value: `Detected "${term.phrase}" in website text.`,
        confidence,
        sourceUrl: website || undefined,
        observedAt,
      });
    }
  }

  return {
    ok: true,
    source: "website",
    sourceMode: "manual",
    evidence,
    signals,
    message:
      signals.length === 0
        ? "No hiring signals detected in the provided text."
        : undefined,
  };
}
