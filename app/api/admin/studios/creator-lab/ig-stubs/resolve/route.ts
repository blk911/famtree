// app/api/admin/studios/creator-lab/ig-stubs/resolve/route.ts
// POST /api/admin/studios/creator-lab/ig-stubs/resolve

export const dynamic = "force-dynamic";
export const maxDuration = 90;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sanitizeHandle } from "@/lib/studios/creator-lab/ig-stubs/url-patterns";
import { fetchAndResolveIgSeeds } from "@/lib/studios/creator-lab/ig-stubs/resolve-seed";
import { upsertProspect } from "@/lib/studios/prospects/store";
import { resultToProspect, generateBatchId } from "@/lib/studios/prospects/from-resolver";
import {
  applyGgSalonEnrichment,
  upsertInputToGgEnrichInput,
} from "@/lib/intelligence/salon/apply-gg-enrichment";
import type {
  IgSeed,
  ResolveResponse,
  ResolveErrorResponse,
} from "@/lib/studios/creator-lab/ig-stubs/types";

const SeedSchema = z.object({
  handle: z.string().min(1).max(60),
  displayName: z.string().max(120).default(""),
});

const RequestSchema = z.object({
  seeds: z.array(SeedSchema).min(1).max(10),
  mode: z.enum(["fast", "deep"]),
});

function err(error: string, detail?: string, status = 400) {
  return NextResponse.json({ ok: false, error, detail } as ResolveErrorResponse, { status });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON body");
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return err("Validation error", parsed.error.errors[0]?.message);
  }

  const { seeds, mode } = parsed.data;

  if (mode === "deep" && !process.env.OPENAI_API_KEY) {
    return err(
      "Deep Research Mode requires OPENAI_API_KEY",
      "Add OPENAI_API_KEY to Vercel → Settings → Environment Variables.",
      503,
    );
  }

  const cleanSeeds: IgSeed[] = seeds.map((s) => ({
    handle: sanitizeHandle(s.handle),
    displayName: s.displayName.trim() || sanitizeHandle(s.handle),
  }));

  const activeSeed = mode === "deep" ? cleanSeeds.slice(0, 5) : cleanSeeds;
  const batchId = generateBatchId();

  const { results } = await fetchAndResolveIgSeeds(activeSeed, mode);

  void (async () => {
    try {
      await Promise.allSettled(
        results.map(async (result, index) => {
          let input = await resultToProspect(result, batchId, {
            enableHandleDerivedGlossGenius: false,
            skipLegacyBookingEnrichment: true,
            vertical: "salon",
          });
          if (!input) return;
          const enrich = await applyGgSalonEnrichment(upsertInputToGgEnrichInput(input), {
            index,
            runGgOnAllDeduped: true,
          });
          const enrichDbg = enrich.bookingFields.providerDiscoveryDebug;
          input = {
            ...input,
            ...enrich.bookingFields,
            providerDiscoveryDebug: {
              ...input.providerDiscoveryDebug,
              ...enrichDbg,
              directUrlsScanned:
                input.providerDiscoveryDebug?.directUrlsScanned ??
                enrichDbg?.directUrlsScanned,
              linkTrailUrlsScanned:
                input.providerDiscoveryDebug?.linkTrailUrlsScanned ??
                enrichDbg?.linkTrailUrlsScanned,
              urlsScanned: input.providerDiscoveryDebug?.urlsScanned,
              externalUrl: input.providerDiscoveryDebug?.externalUrl,
              bioUrls: input.providerDiscoveryDebug?.bioUrls,
            },
          };
          await upsertProspect(input);
        }),
      );
    } catch (e) {
      console.error("[ig-stubs/resolve] prospect upsert failed:", e);
    }
  })();

  return NextResponse.json(
    { ok: true, results, mode, processedAt: new Date().toISOString() } satisfies ResolveResponse,
    { status: 200 },
  );
}
