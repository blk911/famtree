// lib/intelligence/salon/business-stack/apply-stack-enrichment.ts

import type { UpsertInput } from "@/lib/studios/prospects/store";
import type { ProspectRecord } from "@/lib/studios/prospects/types";
import { collectStackUrls } from "./collect-urls";
import {
  buildBusinessStackForProspect,
  maybeUpgradeBookingFromStack,
  type BookingUpgradeFromStack,
} from "./stack-engine";
import { upsertBusinessStack } from "./stack-store";
import type { SalonBusinessStack } from "./types";
import type { StackBuildMeta, StackProspectInput } from "./types";

export async function enrichProspectWithBusinessStack(
  input: StackProspectInput & { prospectId?: string },
  options?: { crawlWebsite?: boolean; persist?: boolean },
): Promise<{
  stack: SalonBusinessStack;
  bookingUpgrade: BookingUpgradeFromStack | null;
  meta: StackBuildMeta;
  providersFound: string[];
}> {
  const { stack, meta } = await buildBusinessStackForProspect(
    {
      prospectId: input.prospectId,
      instagramHandle: input.instagramHandle,
      displayName: input.displayName ?? undefined,
      website: input.website,
      bioUrl: input.bioUrl,
      bestMatchUrl: input.bestMatchUrl,
      bookingUrl: input.bookingUrl,
      linkInBioUrl: input.linkInBioUrl,
      linkTrailUrls: input.linkTrailUrls,
      linkTrailUrlsScanned: input.linkTrailUrlsScanned,
      allMatchedUrls: input.allMatchedUrls,
      collectedUrls: input.collectedUrls,
      collectedDirectUrls: input.collectedDirectUrls,
      collectedLinkUrls: input.collectedLinkUrls,
      bookingProvider: input.bookingProvider,
      bookingProviderConfidence: input.bookingProviderConfidence,
      bookingProviderSource: input.bookingProviderSource,
    },
    { crawlWebsite: options?.crawlWebsite ?? false },
  );

  if (options?.persist !== false && stack.prospectId) {
    try {
      await upsertBusinessStack(stack);
    } catch {
      // non-fatal
    }
  }

  const bookingUpgrade = maybeUpgradeBookingFromStack(
    {
      bookingProvider: input.bookingProvider,
      bookingProviderLabel: undefined,
      bookingUrl: input.bookingUrl ?? undefined,
      bookingProviderConfidence: input.bookingProviderConfidence,
      bookingProviderSource: input.bookingProviderSource,
    },
    stack,
  );

  const providersFound = Array.from(new Set(stack.signals.map((s) => s.providerId)));

  return { stack, bookingUpgrade, meta, providersFound };
}

/** Map upsert payload to stack input (includes debug URL fields when present on record). */
export function upsertInputToStackInput(
  upsert: UpsertInput & {
    providerDiscoveryDebug?: ProspectRecord["providerDiscoveryDebug"];
  },
  prospectId?: string,
): StackProspectInput & { prospectId?: string } {
  const urls = collectStackUrls({
    website: upsert.bestMatch?.url,
    bestMatchUrl: upsert.bestMatch?.url,
    bookingUrl: upsert.bookingUrl,
    linkInBioUrl: upsert.linkInBioUrl,
    linkTrailUrls: upsert.linkTrailUrlsScanned,
    linkTrailUrlsScanned: upsert.linkTrailUrlsScanned,
    allMatchedUrls: upsert.allMatchedUrls,
    providerDiscoveryDebug: upsert.providerDiscoveryDebug,
    instagramHandle: upsert.identity.handle,
  });

  const handle = upsert.identity.handle.replace(/^@/, "");
  return {
    prospectId,
    instagramHandle: upsert.identity.handle,
    displayName: upsert.identity.name,
    website: upsert.bestMatch?.url,
    bioUrl: handle ? `https://www.instagram.com/${handle}/` : undefined,
    bestMatchUrl: upsert.bestMatch?.url,
    allMatchedUrls: urls.all.map((url) => ({ url })),
    linkTrailUrls: urls.linkInBio,
    linkTrailUrlsScanned: upsert.linkTrailUrlsScanned,
    linkInBioUrl: upsert.linkInBioUrl,
    bookingProvider: upsert.bookingProvider,
    bookingProviderConfidence: upsert.bookingProviderConfidence,
    bookingProviderSource: upsert.bookingProviderSource,
    bookingUrl: upsert.bookingUrl,
    collectedUrls: urls.all,
    collectedDirectUrls: urls.direct,
    collectedLinkUrls: urls.linkInBio,
  };
}
