// lib/intelligence/salon/business-stack/apply-stack-enrichment.ts

import type { UpsertInput } from "@/lib/studios/prospects/store";
import {
  buildBusinessStackForProspect,
  maybeUpgradeBookingFromStack,
  prospectToStackInput,
  type BookingUpgradeFromStack,
} from "./stack-engine";
import { upsertBusinessStack } from "./stack-store";
import type { SalonBusinessStack } from "./types";
import type { StackProspectInput } from "./types";

export async function enrichProspectWithBusinessStack(
  input: StackProspectInput & { prospectId?: string },
  options?: { crawlWebsite?: boolean; persist?: boolean },
): Promise<{
  stack: SalonBusinessStack;
  bookingUpgrade: BookingUpgradeFromStack | null;
}> {
  const stack = await buildBusinessStackForProspect(
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

  return { stack, bookingUpgrade };
}

export function upsertInputToStackInput(
  upsert: UpsertInput,
  prospectId?: string,
): StackProspectInput & { prospectId?: string } {
  const handle = upsert.identity.handle.replace(/^@/, "");
  return {
    prospectId,
    instagramHandle: upsert.identity.handle,
    displayName: upsert.identity.name,
    website: upsert.bestMatch?.url,
    bioUrl: handle ? `https://www.instagram.com/${handle}/` : undefined,
    bestMatchUrl: upsert.bestMatch?.url,
    allMatchedUrls: upsert.allMatchedUrls,
    linkTrailUrls: upsert.linkTrailUrlsScanned,
    linkTrailUrlsScanned: upsert.linkTrailUrlsScanned,
    linkInBioUrl: upsert.linkInBioUrl,
    bookingProvider: upsert.bookingProvider,
    bookingProviderConfidence: upsert.bookingProviderConfidence,
    bookingProviderSource: upsert.bookingProviderSource,
    bookingUrl: upsert.bookingUrl,
  };
}
