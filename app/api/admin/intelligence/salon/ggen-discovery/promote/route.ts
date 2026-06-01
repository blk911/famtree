// POST /api/admin/intelligence/salon/ggen-discovery/promote

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { loadGgenDiscoveryRun } from "@/lib/intelligence/salon/ggen-seed-discovery/store";
import { promoteGgenDiscoveryResults } from "@/lib/intelligence/salon/ggen-seed-discovery/promote";
import type { GgenSeedDiscoveryResult } from "@/lib/intelligence/salon/ggen-seed-discovery/types";

const RequestSchema = z.object({
  runId: z.string().min(1),
  resultIds: z.array(z.string()).optional(),
  results: z.array(z.custom<GgenSeedDiscoveryResult>()).optional(),
  importCandidateOnly: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const parsed = RequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid request", detail: parsed.error.message },
        { status: 400 },
      );
    }

    let results = parsed.data.results;
    if (!results?.length) {
      const run = await loadGgenDiscoveryRun(parsed.data.runId);
      if (!run) {
        return NextResponse.json({ ok: false, error: "run not found" }, { status: 404 });
      }
      results = run.results;
    }

    if (parsed.data.importCandidateOnly) {
      results = results.filter((r) => r.importCandidate);
    }

    const promoted = await promoteGgenDiscoveryResults(
      results,
      parsed.data.runId,
      parsed.data.resultIds,
    );

    return NextResponse.json({
      ok: true,
      promotedCount: promoted.filter((p) => p.action !== "skipped").length,
      promoted,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "promote failed", detail }, { status: 500 });
  }
}
