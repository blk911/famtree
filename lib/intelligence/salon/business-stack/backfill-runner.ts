// lib/intelligence/salon/business-stack/backfill-runner.ts

import type { ProspectRecord } from "@/lib/studios/prospects/types";
import { upsertProspect } from "@/lib/studios/prospects/store";
import type { UpsertInput } from "@/lib/studios/prospects/store";
import { prospectRecordToStackInput } from "./collect-urls";
import {
  buildBusinessStackForProspect,
  maybeUpgradeBookingFromStack,
} from "./stack-engine";
import {
  bookingUpgradeFromGgStack,
  type GgBookingFromStack,
} from "./glossgenius-stack";
import {
  accumulateBackfillStats,
  initProviderBackfillStats,
  revalidateProspectBookingFields,
} from "../provider-validation/revalidate-prospect-booking";
import { getBusinessStack, upsertBusinessStack } from "./stack-store";
import { auditSalonProspectUrlCoverage } from "./url-coverage";
import type { StackBackfillProspectResult, StackBackfillSummary } from "./types";

export type RunStackBackfillOptions = {
  crawlWebsite?: boolean;
  persistBookingUpgrade?: boolean;
};

function prospectToUpsert(p: ProspectRecord): UpsertInput {
  const {
    prospectId,
    identityFingerprint,
    createdAt,
    updatedAt,
    status,
    notes,
    validationStatus,
    archiveReason,
    ...rest
  } = p;
  return { ...rest, suggestedValidationStatus: validationStatus };
}

export async function runSalonStackBackfill(
  prospects: ProspectRecord[],
  options?: RunStackBackfillOptions,
): Promise<StackBackfillSummary> {
  const crawlWebsite = options?.crawlWebsite ?? false;
  const persistBooking = options?.persistBookingUpgrade ?? true;

  let stacksCreated = 0;
  let stacksUpdated = 0;
  let providersFound = 0;
  let bookingProvidersFound = 0;
  let paymentProvidersFound = 0;
  let checkInProvidersFound = 0;
  let websiteBuildersFound = 0;
  let skippedNoUrls = 0;
  let failed = 0;
  let ggLinksSeen = 0;
  let ggClientPagesConfirmed = 0;
  let ggGenericRejected = 0;
  let ggUpdatedProspects = 0;
  const errors: string[] = [];
  const sample: StackBackfillSummary["sample"] = [];
  const results: StackBackfillProspectResult[] = [];
  const providerValidationStats = initProviderBackfillStats();

  const urlCoverageAtStart = auditSalonProspectUrlCoverage(prospects, 0);

  for (const p of prospects) {
    const handle = p.identity.handle.replace(/^@+/, "");
    const baseResult: StackBackfillProspectResult = {
      prospectId: p.prospectId,
      handle,
      urlsScanned: 0,
      signalsFound: 0,
      providersFound: [],
      errors: [],
      warnings: [],
    };

    try {
      const revalidate = await revalidateProspectBookingFields(p);
      accumulateBackfillStats(
        providerValidationStats,
        revalidate.validation,
        revalidate.downgraded,
        p.bookingProvider,
      );
      if (revalidate.downgraded && persistBooking) {
        try {
          await upsertProspect({
            ...prospectToUpsert(p),
            ...revalidate.fields,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          baseResult.warnings.push(`revalidate_downgrade_failed:${msg}`);
        }
      }

      const stackInput = prospectRecordToStackInput({
        ...p,
        ...revalidate.fields,
      } as ProspectRecord);
      baseResult.urlsScanned = stackInput.collectedUrls?.length ?? 0;

      if (baseResult.urlsScanned === 0) {
        skippedNoUrls++;
        baseResult.skipped = true;
        baseResult.warnings.push("no_urls");
        results.push(baseResult);
        continue;
      }

      const hadStack = Boolean(await getBusinessStack(p.prospectId));
      const ggStats = {
        ggLinksSeen: 0,
        ggClientPagesConfirmed: 0,
        ggGenericRejected: 0,
      };
      const { stack, meta } = await buildBusinessStackForProspect(stackInput, {
        crawlWebsite,
        expandLinkInBio: true,
        ggStats,
      });
      ggLinksSeen += ggStats.ggLinksSeen;
      ggClientPagesConfirmed += ggStats.ggClientPagesConfirmed;
      ggGenericRejected += ggStats.ggGenericRejected;

      baseResult.warnings.push(...meta.warnings);
      baseResult.urlsScanned = meta.urlsScanned;
      baseResult.signalsFound = stack.signals.length;
      baseResult.providersFound = Array.from(
        new Set(stack.signals.map((s) => s.providerId)),
      );
      baseResult.primaryBookingProvider = stack.primaryBookingProvider;
      baseResult.primaryPaymentProvider = stack.primaryPaymentProvider;
      baseResult.checkInProvider = stack.checkInProvider;
      baseResult.websiteBuilder = stack.websiteBuilder;

      try {
        await upsertBusinessStack({ ...stack, prospectId: p.prospectId });
        if (hadStack) stacksUpdated++;
        else stacksCreated++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        baseResult.warnings.push(`persist_failed:${msg}`);
        errors.push(`${handle}: persist ${msg}`);
      }

      if (stack.signals.length > 0) providersFound++;
      if (stack.primaryBookingProvider) bookingProvidersFound++;
      if (stack.primaryPaymentProvider) paymentProvidersFound++;
      if (stack.checkInProvider) checkInProvidersFound++;
      if (stack.websiteBuilder) websiteBuildersFound++;

      const stackUpgrade = maybeUpgradeBookingFromStack(
        {
          bookingProvider: p.bookingProvider,
          bookingUrl: p.bookingUrl ?? undefined,
          bookingProviderConfidence: p.bookingProviderConfidence,
          bookingProviderSource: p.bookingProviderSource,
        },
        stack,
      );
      const ggUpgrade: GgBookingFromStack | null = stackUpgrade
        ? null
        : bookingUpgradeFromGgStack(stack, {
            bookingProvider: p.bookingProvider,
            bookingProviderConfidence: p.bookingProviderConfidence,
            bookingProviderSource: p.bookingProviderSource,
          });
      const bookingUpgrade = stackUpgrade ?? ggUpgrade;

      if (persistBooking && bookingUpgrade) {
        try {
          await upsertProspect({
            ...prospectToUpsert(p),
            bookingProvider: bookingUpgrade.bookingProvider,
            bookingProviderLabel: bookingUpgrade.bookingProviderLabel,
            bookingUrl: bookingUpgrade.bookingUrl,
            bookingProviderConfidence: bookingUpgrade.bookingProviderConfidence,
            bookingProviderEvidence: bookingUpgrade.bookingProviderEvidence,
            bookingProviderSource: bookingUpgrade.bookingProviderSource,
            ...(ggUpgrade
              ? {
                  ggValidationStatus: ggUpgrade.ggValidationStatus,
                  ggValidatedUrl: ggUpgrade.bookingUrl,
                }
              : {}),
          });
          if (bookingUpgrade.bookingProvider === "glossgenius") {
            ggUpdatedProspects++;
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          baseResult.warnings.push(`booking_upgrade_failed:${msg}`);
        }
      }

      if (sample.length < 8) {
        sample.push({
          handle,
          booking: stack.primaryBookingProvider,
          payment: stack.primaryPaymentProvider,
          checkIn: stack.checkInProvider,
          score: stack.stackCompletenessScore,
        });
      }

      results.push(baseResult);
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      baseResult.failed = true;
      baseResult.errors.push(msg);
      errors.push(`${handle}: ${msg}`);
      results.push(baseResult);
    }
  }

  const urlCoverage = auditSalonProspectUrlCoverage(prospects, skippedNoUrls);

  return {
    ok: true,
    checked: prospects.length,
    stacksCreated,
    stacksUpdated,
    providersFound,
    bookingProvidersFound,
    paymentProvidersFound,
    checkInProvidersFound,
    websiteBuildersFound,
    skippedNoUrls,
    prospectsChecked: urlCoverage.prospectsChecked,
    prospectsWithHandle: urlCoverage.prospectsWithHandle,
    prospectsWithAnyUrl: urlCoverageAtStart.prospectsWithAnyUrl,
    prospectsWithExternalUrl: urlCoverage.prospectsWithExternalUrl,
    prospectsWithBioUrls: urlCoverage.prospectsWithBioUrls,
    prospectsWithBestUrl: urlCoverage.prospectsWithBestUrl,
    failed,
    ggLinksSeen,
    ggClientPagesConfirmed,
    ggGenericRejected,
    ggUpdatedProspects,
    candidatesFound: providerValidationStats.candidatesFound,
    validationsRun: providerValidationStats.validationsRun,
    confirmedProviders: providerValidationStats.confirmedProviders,
    rejectedGenericHomepage: providerValidationStats.rejectedGenericHomepage,
    rejectedNotFound: providerValidationStats.rejectedNotFound,
    downgradedFalsePositives: providerValidationStats.downgradedFalsePositives,
    providersByType: providerValidationStats.providersByType,
    errors,
    sample,
    results,
  };
}
