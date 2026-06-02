// lib/intelligence/salon/business-stack/stack-engine.ts

import type { ProspectRecord } from "@/lib/studios/prospects/types";
import type { BookingProviderSource } from "../enrich-booking-provider";
import { isLinkInBioUrl } from "../provider-detector";
import {
  detectBusinessStackFromUrls,
  mergeStackSignals,
} from "./fingerprint-detector";
import { crawlWebsiteForStack } from "./website-stack-crawler";
import type {
  SalonBusinessStack,
  SalonOperationalMaturity,
  SalonStackSignal,
  StackProspectInput,
} from "./types";

const DIRECT_PROTECT_CONF = 90;

function uniqueUrls(urls: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const u = (raw ?? "").trim();
    if (!u || !u.startsWith("http")) continue;
    const key = u.toLowerCase().replace(/\/+$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u);
  }
  return out;
}

export function prospectToStackInput(prospect: ProspectRecord): StackProspectInput {
  return {
    prospectId: prospect.prospectId,
    instagramHandle: prospect.identity.handle,
    displayName: prospect.identity.name,
    website: prospect.bestMatch?.url,
    bioUrl: prospect.linkInBioUrl,
    bestMatchUrl: prospect.bestMatch?.url ?? prospect.bookingUrl,
    bookingUrl: prospect.bookingUrl,
    linkInBioUrl: prospect.linkInBioUrl,
    linkTrailUrls: prospect.linkTrailUrlsScanned,
    linkTrailUrlsScanned: prospect.linkTrailUrlsScanned,
    allMatchedUrls: prospect.allMatchedUrls,
    bookingProvider: prospect.bookingProvider,
    bookingProviderConfidence: prospect.bookingProviderConfidence,
    bookingProviderSource: prospect.bookingProviderSource,
  };
}

function scoreCompleteness(stack: Omit<SalonBusinessStack, "stackCompletenessScore" | "operationalMaturity" | "importOpportunity" | "updatedAt">): number {
  let score = 0;
  if (stack.primaryBookingProvider) score += 25;
  if (stack.primaryPaymentProvider) score += 20;
  if (stack.websiteBuilder) score += 15;
  if ((stack.reviewPresence?.length ?? 0) > 0) score += 10;
  if ((stack.marketingPixels?.length ?? 0) > 0) score += 10;
  if (stack.checkInProvider) score += 10;
  if (stack.signals.some((s) => s.category === "social")) score += 10;
  return Math.min(100, score);
}

function maturityFromScore(score: number): SalonOperationalMaturity {
  if (score >= 70) return "high";
  if (score >= 30) return "medium";
  return "low";
}

function pickPrimary(
  signals: SalonStackSignal[],
  category: SalonStackSignal["category"],
): string | undefined {
  const hit = signals.find((s) => s.category === category);
  return hit?.providerId;
}

function pickReviews(signals: SalonStackSignal[]): string[] {
  return Array.from(
    new Set(
      signals.filter((s) => s.category === "reviews").map((s) => s.providerId),
    ),
  );
}

function pickMarketing(signals: SalonStackSignal[]): string[] {
  return Array.from(
    new Set(
      signals
        .filter((s) => s.category === "marketing" || s.category === "analytics")
        .map((s) => s.providerLabel),
    ),
  );
}

function finalizeStack(
  partial: Omit<SalonBusinessStack, "stackCompletenessScore" | "operationalMaturity" | "importOpportunity" | "updatedAt">,
): SalonBusinessStack {
  const stackCompletenessScore = scoreCompleteness(partial);
  return {
    ...partial,
    stackCompletenessScore,
    operationalMaturity: maturityFromScore(stackCompletenessScore),
    importOpportunity: Boolean(
      partial.primaryBookingProvider || partial.primaryPaymentProvider,
    ),
    updatedAt: new Date().toISOString(),
  };
}

export async function buildBusinessStackForProspect(
  prospect: StackProspectInput | ProspectRecord,
  options?: { crawlWebsite?: boolean },
): Promise<SalonBusinessStack> {
  const input =
    "identity" in prospect ? prospectToStackInput(prospect as ProspectRecord) : prospect;

  const directUrls = uniqueUrls([
    input.bookingUrl,
    input.bestMatchUrl,
    input.website,
    input.bioUrl,
    ...(input.allMatchedUrls ?? []).map((u) => (typeof u === "string" ? u : u.url)),
  ]).filter((u) => !isLinkInBioUrl(u));

  const linkUrls = uniqueUrls([
    input.linkInBioUrl,
    ...(input.linkTrailUrlsScanned ?? []),
    ...(input.linkTrailUrls ?? []),
  ]);

  const allUrls = uniqueUrls([...directUrls, ...linkUrls]);
  const notes: string[] = [];
  let signals: SalonStackSignal[] = [];

  signals.push(
    ...detectBusinessStackFromUrls({
      prospectId: input.prospectId,
      instagramHandle: input.instagramHandle,
      urls: directUrls,
      source: "direct_url",
    }),
  );

  signals.push(
    ...detectBusinessStackFromUrls({
      prospectId: input.prospectId,
      instagramHandle: input.instagramHandle,
      urls: linkUrls,
      source: "link_in_bio",
    }),
  );

  const websiteCandidate =
    directUrls.find((u) => !isLinkInBioUrl(u) && !u.includes("instagram.com")) ??
    linkUrls.find((u) => !isLinkInBioUrl(u));

  if (options?.crawlWebsite && websiteCandidate) {
    const crawl = await crawlWebsiteForStack(websiteCandidate, {
      prospectId: input.prospectId,
      instagramHandle: input.instagramHandle,
    });
    if (crawl.ok) {
      signals.push(...crawl.signals);
      notes.push(`website_crawl:${crawl.finalUrl}`);
    } else if (crawl.errors.length) {
      notes.push(`crawl_error:${crawl.errors.join(",")}`);
    }
  }

  signals = mergeStackSignals(signals);

  const stack = finalizeStack({
    prospectId: input.prospectId,
    instagramHandle: input.instagramHandle?.replace(/^@+/, ""),
    signals,
    primaryBookingProvider: pickPrimary(signals, "booking"),
    primaryPaymentProvider: pickPrimary(signals, "payments"),
    websiteBuilder:
      pickPrimary(signals, "website_builder") ?? pickPrimary(signals, "ecommerce"),
    checkInProvider: pickPrimary(signals, "check_in"),
    reviewPresence: pickReviews(signals),
    marketingPixels: pickMarketing(signals),
    notes,
  });

  return stack;
}

export type BookingUpgradeFromStack = {
  bookingProvider?: string;
  bookingProviderLabel?: string;
  bookingUrl?: string;
  bookingProviderConfidence?: number;
  bookingProviderEvidence?: string[];
  bookingProviderSource?: BookingProviderSource;
};

const STACK_TO_LEGACY_BOOKING: Record<string, string> = {
  glossgenius: "glossgenius",
  vagaro: "vagaro",
  square_appointments: "square",
  booksy: "booksy",
  fresha: "fresha",
  styleseat: "styleseat",
  schedulicity: "schedulicity",
  acuity: "acuity",
  mangomint: "mangomint",
  timely: "timely",
  setmore: "setmore",
};

const STACK_LABELS: Record<string, string> = {
  glossgenius: "GlossGenius",
  vagaro: "Vagaro",
  square_appointments: "Square",
  booksy: "Booksy",
  fresha: "Fresha",
  styleseat: "StyleSeat",
};

export function maybeUpgradeBookingFromStack(
  existing: {
    bookingProvider?: string;
    bookingProviderLabel?: string;
    bookingUrl?: string;
    bookingProviderConfidence?: number;
    bookingProviderEvidence?: string[];
    bookingProviderSource?: string;
  },
  stack: SalonBusinessStack,
): BookingUpgradeFromStack | null {
  const existingConf = existing.bookingProviderConfidence ?? 0;
  const protectedDirect =
    existingConf >= DIRECT_PROTECT_CONF &&
    (existing.bookingProviderSource === "direct_url" ||
      existing.bookingProviderSource === "link_in_bio" ||
      existing.bookingProviderSource === "link_trail");

  if (protectedDirect && existing.bookingProvider) {
    return null;
  }

  const bookingId = stack.primaryBookingProvider;
  if (!bookingId) return null;

  const signal = stack.signals.find(
    (s) => s.category === "booking" && s.providerId === bookingId,
  );
  if (!signal) return null;

  const newConf = Math.round(signal.confidence * 100);
  if (existing.bookingProvider && newConf <= existingConf) {
    return null;
  }

  const legacyProvider = STACK_TO_LEGACY_BOOKING[bookingId] ?? bookingId;
  const label = signal.providerLabel ?? STACK_LABELS[bookingId] ?? legacyProvider;

  return {
    bookingProvider: legacyProvider,
    bookingProviderLabel: label,
    bookingUrl: signal.url ?? existing.bookingUrl,
    bookingProviderConfidence: newConf,
    bookingProviderEvidence: [
      ...(existing.bookingProviderEvidence ?? []),
      `stack:${signal.source}`,
      ...signal.evidence,
    ].slice(0, 12),
    bookingProviderSource: (
      signal.source === "link_in_bio"
        ? "link_in_bio"
        : signal.source === "website_link" || signal.source === "website_html"
          ? "website_crawl"
          : "direct_url"
    ) as BookingProviderSource,
  };
}
