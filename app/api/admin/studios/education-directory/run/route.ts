// app/api/admin/studios/education-directory/run/route.ts
// POST /api/admin/studios/education-directory/run
// Admin-only. Parses directory text, resolves identities, upserts prospects.

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { runDirectoryPipeline } from "@/lib/studios/education-directory/resolver";
import {
  generateDirectoryRunId,
  saveDirectoryRun,
} from "@/lib/studios/education-directory/store";
import { getStoreBackendInfo, countProspects } from "@/lib/studios/prospects/store";
import type {
  DirectoryRunResponse,
  DirectoryErrorResponse,
  DirectoryRunFile,
} from "@/lib/studios/education-directory/types";

const RequestSchema = z.object({
  inputText:            z.string().min(1, "inputText is required"),
  mode:                 z.enum(["fast", "deep"]).default("fast"),
  maxCandidatesPerSeed: z.number().int().min(1).max(12).optional(),
  dryRun:               z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const body   = await req.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid request", detail: parsed.error.message } satisfies DirectoryErrorResponse,
        { status: 400 }
      );
    }

    const { inputText, mode, maxCandidatesPerSeed, dryRun } = parsed.data;
    const runId = generateDirectoryRunId();

    const backendInfo          = await getStoreBackendInfo();
    const storePath            = backendInfo.storePath;
    const prospectsBeforeCount = await countProspects();

    console.log(`[education-directory/run] starting ${runId} — backend: ${backendInfo.backend}, store: ${storePath ?? "postgres"} (${prospectsBeforeCount} existing)`);

    const result = await runDirectoryPipeline(inputText, runId, {
      mode,
      maxCandidatesPerSeed,
      dryRun,
    });

    const prospectsAfterCount = await countProspects();

    console.log(
      `[education-directory/run] complete — ` +
      `parsed=${result.parsedCount}, saved=${result.assemblerResult.savedCount}, ` +
      `before=${prospectsBeforeCount}, after=${prospectsAfterCount}`
    );

    // Persist run file
    const runFile: DirectoryRunFile = {
      summary: {
        runId,
        createdAt:           new Date().toISOString(),
        mode,
        inputLineCount:      inputText.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#")).length,
        parsedCount:         result.parsedCount,
        savedCount:          result.assemblerResult.savedCount,
        failedToSaveCount:   result.assemblerResult.failedToSaveCount,
        totalIgFound:        result.assemblerResult.totalIgFound,
        prospectsBeforeCount,
        prospectsAfterCount,
        storePath,
        prospectStoreBackend: backendInfo.backend,
      },
      entries:         result.entries,
      assemblerResult: result.assemblerResult,
    };

    await saveDirectoryRun(runFile);

    return NextResponse.json({
      ok: true,
      runId,
      parsedCount:          result.parsedCount,
      assemblerResult:      result.assemblerResult,
      entries:              result.entries,
      processedAt:          new Date().toISOString(),
      storePath,
      prospectStoreBackend: backendInfo.backend,
      prospectsBeforeCount,
      prospectsAfterCount,
    } satisfies DirectoryRunResponse);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[education-directory/run] error:", msg);
    return NextResponse.json(
      { ok: false, error: "Directory run failed", detail: msg } satisfies DirectoryErrorResponse,
      { status: 500 }
    );
  }
}
