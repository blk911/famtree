// app/api/admin/studios/education-seeds/run/route.ts
// POST /api/admin/studios/education-seeds/run
// Parses a textarea of educator identity strings, resolves IG handles,
// and upserts them into the prospect store.
// Admin-only. Not exposed to members.

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { runEducationSeedPipeline } from "@/lib/studios/education-seeds/resolver";
import { getProspectStorePath, countProspects } from "@/lib/studios/prospects/store";
import type { EducationSeedRunResponse, EducationSeedErrorResponse } from "@/lib/studios/education-seeds/types";

const VALID_EDU_TYPES = [
  "homeschool", "microschool", "learning_pod", "tutor", "subject_tutor",
  "classical_education", "montessori", "stem_science", "math", "reading_literacy",
  "dyslexia_special_needs", "test_prep", "curriculum", "parent_community",
  "co_op", "library_community_learning", "unknown",
] as const;

const VALID_AUDIENCE_TYPES = [
  "parent", "student", "educator", "institution", "mixed", "unknown",
] as const;

const RequestSchema = z.object({
  inputText:            z.string().min(1, "inputText is required"),
  mode:                 z.enum(["fast", "deep"]).default("fast"),
  maxCandidatesPerSeed: z.number().int().min(1).max(12).optional(),
  defaultEducationType: z.enum(VALID_EDU_TYPES).optional(),
  defaultAudienceType:  z.enum(VALID_AUDIENCE_TYPES).optional(),
  dryRun:               z.boolean().optional(),
});

function generateRunId(): string {
  return `edu-run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function POST(req: Request) {
  try {
    const body   = await req.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid request", detail: parsed.error.message } satisfies EducationSeedErrorResponse,
        { status: 400 }
      );
    }

    const config = parsed.data;
    const runId  = generateRunId();

    // Diagnostics: store path + before-count
    const storePath          = getProspectStorePath();
    const prospectsBeforeCount = await countProspects();

    console.log(`[education-seeds/run] starting run ${runId} — store: ${storePath} (${prospectsBeforeCount} existing)`);
    console.log(`[education-seeds/run] mode=${config.mode}, dryRun=${config.dryRun ?? false}`);

    const result = await runEducationSeedPipeline(config, runId);

    const prospectsAfterCount = await countProspects();

    console.log(
      `[education-seeds/run] complete — ` +
      `parsed=${result.parsedCount}, ` +
      `saved=${result.assemblerResult.savedCount}, ` +
      `before=${prospectsBeforeCount}, after=${prospectsAfterCount}`
    );

    return NextResponse.json({
      ok: true,
      runId,
      parsedCount:     result.parsedCount,
      assemblerResult: result.assemblerResult,
      processedAt:     new Date().toISOString(),
      // Diagnostic fields
      storePath,
      prospectsBeforeCount,
      prospectsAfterCount,
    } satisfies EducationSeedRunResponse & {
      storePath: string;
      prospectsBeforeCount: number;
      prospectsAfterCount: number;
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[education-seeds/run] error:", msg);
    return NextResponse.json(
      { ok: false, error: "Education seed run failed", detail: msg } satisfies EducationSeedErrorResponse,
      { status: 500 }
    );
  }
}
