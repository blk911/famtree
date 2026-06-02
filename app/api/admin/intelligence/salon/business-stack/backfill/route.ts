// POST /api/admin/intelligence/salon/business-stack/backfill

export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { filterProspects, upsertProspect } from "@/lib/studios/prospects/store";
import {
  enrichProspectWithBusinessStack,
  upsertInputToStackInput,
} from "@/lib/intelligence/salon/business-stack/apply-stack-enrichment";
import type { ProspectRecord } from "@/lib/studios/prospects/types";
import type { UpsertInput } from "@/lib/studios/prospects/store";

const BodySchema = z.object({
  limit: z.number().int().min(1).max(250).optional().default(50),
  onlyUnknown: z.boolean().optional().default(false),
  crawlWebsite: z.boolean().optional().default(false),
});

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

export async function POST(req: NextRequest) {
  try {
    const { limit, onlyUnknown, crawlWebsite } = BodySchema.parse(await req.json());
    let prospects = await filterProspects({ vertical: "salon" });

    if (onlyUnknown) {
      prospects = prospects.filter(
        (p) =>
          !p.bookingProvider ||
          p.bookingProvider === "unknown" ||
          (p.bookingProviderConfidence ?? 0) < 65,
      );
    }

    prospects = prospects
      .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1))
      .slice(0, limit);

    let stacksCreated = 0;
    let providersFound = 0;
    let bookingProvidersFound = 0;
    let paymentProvidersFound = 0;
    let checkInProvidersFound = 0;
    const errors: string[] = [];
    const sample: Array<{
      handle: string;
      booking?: string;
      payment?: string;
      checkIn?: string;
      score?: number;
    }> = [];

    for (const p of prospects) {
      try {
        const { stack, bookingUpgrade } = await enrichProspectWithBusinessStack(
          upsertInputToStackInput(prospectToUpsert(p), p.prospectId),
          { crawlWebsite, persist: true },
        );
        stacksCreated++;

        if (stack.signals.length > 0) providersFound++;
        if (stack.primaryBookingProvider) bookingProvidersFound++;
        if (stack.primaryPaymentProvider) paymentProvidersFound++;
        if (stack.checkInProvider) checkInProvidersFound++;

        if (bookingUpgrade) {
          await upsertProspect({
            ...prospectToUpsert(p),
            bookingProvider: bookingUpgrade.bookingProvider,
            bookingProviderLabel: bookingUpgrade.bookingProviderLabel,
            bookingUrl: bookingUpgrade.bookingUrl,
            bookingProviderConfidence: bookingUpgrade.bookingProviderConfidence,
            bookingProviderEvidence: bookingUpgrade.bookingProviderEvidence,
            bookingProviderSource: bookingUpgrade.bookingProviderSource,
          });
        }

        if (sample.length < 8) {
          sample.push({
            handle: p.identity.handle,
            booking: stack.primaryBookingProvider,
            payment: stack.primaryPaymentProvider,
            checkIn: stack.checkInProvider,
            score: stack.stackCompletenessScore,
          });
        }
      } catch (e) {
        errors.push(
          `${p.identity.handle}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    return NextResponse.json({
      ok: true,
      checked: prospects.length,
      stacksCreated,
      providersFound,
      bookingProvidersFound,
      paymentProvidersFound,
      checkInProvidersFound,
      errors,
      sample,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "backfill failed", detail },
      { status: 500 },
    );
  }
}
