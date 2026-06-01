// app/api/admin/studios/creator-lab/ig-stubs/resolve/route.ts
// POST /api/admin/studios/creator-lab/ig-stubs/resolve
// Resolves IG handles to public booking/store/social URLs via pattern matching + optional AI.

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel Pro; free tier caps at 10s (fast mode only recommended)

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sanitizeHandle, generateCandidateUrls } from "@/lib/studios/creator-lab/ig-stubs/url-patterns";
import { fastResolveTracked } from "@/lib/studios/creator-lab/ig-stubs/validator";
import { upsertProspect } from "@/lib/studios/prospects/store";
import { resultToProspect, generateBatchId } from "@/lib/studios/prospects/from-resolver";
import type {
  IgSeed,
  StubResolutionResult,
  ResolveResponse,
  ResolveErrorResponse,
} from "@/lib/studios/creator-lab/ig-stubs/types";

// ─── Validation ───────────────────────────────────────────────────────────────

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

// ─── Route handler ────────────────────────────────────────────────────────────

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
      503
    );
  }

  // Sanitize seeds
  const cleanSeeds: IgSeed[] = seeds.map((s) => ({
    handle: sanitizeHandle(s.handle),
    displayName: s.displayName.trim() || sanitizeHandle(s.handle),
  }));

  // Cap seeds for deep mode to control AI spend
  const activeSeed = mode === "deep" ? cleanSeeds.slice(0, 5) : cleanSeeds;

  // Batch ID ties all prospect records from this run together
  const batchId = generateBatchId();

  // Process all seeds in parallel
  const settled = await Promise.allSettled(
    activeSeed.map(async (seed): Promise<StubResolutionResult> => {
      const candidates = generateCandidateUrls(seed.handle);

      let validProfiles;
      let candidateUrlsTested: string[] = [];
      let rejectedCandidates: StubResolutionResult["rejectedCandidates"] = [];
      let linkTrailUrls: string[] = [];

      if (mode === "fast") {
        const tracked = await fastResolveTracked(seed, candidates);
        validProfiles = tracked.confirmedProfiles.filter((p) => p.confidenceScore >= 5);
        candidateUrlsTested = tracked.candidateUrlsTested;
        rejectedCandidates = tracked.rejectedCandidates;
        linkTrailUrls = tracked.linkTrailUrls;
      } else {
        const { deepResolve } = await import("@/lib/studios/creator-lab/ig-stubs/deep-research");
        const profiles = await deepResolve(seed, candidates);
        validProfiles = profiles.filter((p) => p.confidenceScore >= 5);
        candidateUrlsTested = candidates.map((c) => c.url);
      }

      const bestMatch = validProfiles[0] ?? null;

      const status: StubResolutionResult["status"] =
        bestMatch && bestMatch.confidenceScore >= 50
          ? "resolved"
          : bestMatch && bestMatch.confidenceScore >= 20
          ? "partial"
          : "unresolved";

      return {
        seed,
        resolvedProfiles: validProfiles,
        bestMatch,
        status,
        candidateUrlsTested,
        rejectedCandidates,
        linkTrailUrls,
      };
    })
  );

  const results: StubResolutionResult[] = settled.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          seed: activeSeed[i],
          resolvedProfiles: [],
          bestMatch: null,
          status: "unresolved" as const,
        }
  );

  // ── Persist prospects (fire-and-forget — never fail the main response) ─────
  void (async () => {
    try {
      await Promise.allSettled(
        results.map(async (result) => {
          const input = await resultToProspect(result, batchId, {
            enableHandleDerivedGlossGenius: true,
          });
          if (input) await upsertProspect(input);
        })
      );
    } catch (e) {
      console.error("[ig-stubs/resolve] prospect upsert failed:", e);
    }
  })();

  return NextResponse.json(
    { ok: true, results, mode, processedAt: new Date().toISOString() } satisfies ResolveResponse,
    { status: 200 }
  );
}
