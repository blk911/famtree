// app/api/admin/studios/creator-lab/ig-stubs/resolve/route.ts
// POST /api/admin/studios/creator-lab/ig-stubs/resolve
// Resolves IG handles to public booking/store/social URLs via pattern matching + optional AI.

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel Pro; free tier caps at 10s (fast mode only recommended)

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sanitizeHandle, generateCandidateUrls } from "@/lib/studios/creator-lab/ig-stubs/url-patterns";
import { fastResolve } from "@/lib/studios/creator-lab/ig-stubs/validator";
import type {
  IgSeed,
  StubResolutionResult,
  ResolveResponse,
  ResolveErrorResponse,
} from "@/lib/studios/creator-lab/ig-stubs/types";

// ─── Validation ───────────────────────────────────────────────────────────────

const SeedSchema = z.object({
  handle: z.string().min(1).max(60),
  displayName: z.string().min(1).max(120),
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
    displayName: s.displayName.trim(),
  }));

  // Cap seeds for deep mode to control AI spend
  const activeSeed = mode === "deep" ? cleanSeeds.slice(0, 5) : cleanSeeds;

  // Process all seeds in parallel
  const settled = await Promise.allSettled(
    activeSeed.map(async (seed): Promise<StubResolutionResult> => {
      const candidates = generateCandidateUrls(seed.handle);

      let profiles;
      if (mode === "fast") {
        profiles = await fastResolve(seed, candidates);
      } else {
        const { deepResolve } = await import("@/lib/studios/creator-lab/ig-stubs/deep-research");
        profiles = await deepResolve(seed, candidates);
      }

      const validProfiles = profiles.filter((p) => p.confidenceScore >= 5);
      const bestMatch = validProfiles[0] ?? null;

      const status: StubResolutionResult["status"] =
        bestMatch && bestMatch.confidenceScore >= 50
          ? "resolved"
          : bestMatch && bestMatch.confidenceScore >= 20
          ? "partial"
          : "unresolved";

      return { seed, resolvedProfiles: validProfiles, bestMatch, status };
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

  return NextResponse.json(
    { ok: true, results, mode, processedAt: new Date().toISOString() } satisfies ResolveResponse,
    { status: 200 }
  );
}
