// lib/intelligence/salon/business-stack/stack-engine.ts

import type { ProspectRecord } from "@/lib/studios/prospects/types";
import type { BookingProviderSource } from "../enrich-booking-provider";
import { isLinkInBioUrl } from "../provider-detector";
import {
  detectBusinessStackFromUrls,
  mergeStackSignals,
} from "./fingerprint-detector";
import { crawlWebsiteForStack } from "./website-stack-crawler";
import { expandLinkInBioUrlsFromList } from "../link-in-bio-expander";
import { collectStackUrls, prospectRecordToStackInput } from "./collect-urls";
import {
  detectValidatedGlossGeniusStackSignals,
  type GgStackDetectStats,
} from "./glossgenius-stack";
import type {
  SalonBusinessStack,
  SalonOperationalMaturity,
  SalonStackSignal,
  StackBuildMeta,
  StackProspectInput,
} from "./types";

const DIRECT_PROTECT_CONF = 90;

export { prospectRecordToStackInput as prospectToStackInput } from "./collect-urls";

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
  options?: {
    crawlWebsite?: boolean;
    expandLinkInBio?: boolean;
    ggStats?: GgStackDetectStats;
  },
): Promise<{ stack: SalonBusinessStack; meta: StackBuildMeta }> {
  const input =
    "identity" in prospect
      ? prospectRecordToStackInput(prospect as ProspectRecord)
      : prospect;

  const collected =
    input.collectedUrls && input.collectedDirectUrls && input.collectedLinkUrls
      ? {
          all: input.collectedUrls,
          direct: input.collectedDirectUrls,
          linkInBio: input.collectedLinkUrls,
        }
      : collectStackUrls({
          website: input.website,
          bioUrl: input.bioUrl,
          bestMatchUrl: input.bestMatchUrl,
          bookingUrl: input.bookingUrl,
          linkInBioUrl: input.linkInBioUrl,
          linkTrailUrls: input.linkTrailUrls,
          linkTrailUrlsScanned: input.linkTrailUrlsScanned,
          allMatchedUrls: input.allMatchedUrls,
          instagramHandle: input.instagramHandle,
        });

  let directUrls = [...collected.direct];
  let linkUrls = [...collected.linkInBio];
  let allUrls = [...collected.all];
  const notes: string[] = [];
  const warnings: string[] = [];

  if (options?.expandLinkInBio !== false) {
    const { expanded, diagnostics } = await expandLinkInBioUrlsFromList(allUrls);
    allUrls = expanded;
    for (const d of diagnostics) {
      if (d.linkInBioProviderLinks.length) {
        notes.push(
          `link_in_bio_providers:${d.linkInBioProviderLinks.slice(0, 3).join(",")}`,
        );
      }
      if (d.fetchError) warnings.push(`link_in_bio_expand:${d.fetchError}`);
    }
    const seenD = new Set(directUrls.map((u) => u.toLowerCase()));
    const seenL = new Set(linkUrls.map((u) => u.toLowerCase()));
    for (const u of expanded) {
      const key = u.toLowerCase();
      if (isLinkInBioUrl(u)) {
        if (!seenL.has(key)) {
          seenL.add(key);
          linkUrls.push(u);
        }
      } else if (!seenD.has(key)) {
        seenD.add(key);
        directUrls.push(u);
      }
    }
  }

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

  const handleHint = input.instagramHandle?.replace(/^@+/, "");
  signals.push(
    ...(await detectValidatedGlossGeniusStackSignals({
      urls: [...directUrls, ...linkUrls],
      source: "direct_url",
      handleHint,
      displayNameHint: input.displayName ?? undefined,
      stats: options?.ggStats,
    })),
  );
  signals.push(
    ...(await detectValidatedGlossGeniusStackSignals({
      urls: linkUrls,
      source: "link_in_bio",
      handleHint,
      displayNameHint: input.displayName ?? undefined,
      stats: options?.ggStats,
    })),
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
      const msg = crawl.errors.join(",");
      notes.push(`crawl_error:${msg}`);
      warnings.push(`website_crawl_failed:${msg}`);
    }
  } else if (options?.crawlWebsite && !websiteCandidate) {
    warnings.push("website_crawl_skipped:no_candidate_url");
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

  return {
    stack,
    meta: {
      urlsScanned: allUrls.length,
      allUrls,
      warnings: [...warnings, ...notes.filter((n) => n.startsWith("crawl_"))],
    },
  };
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
