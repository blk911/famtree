// POST /api/admin/intelligence/salon/source-ingest/directory-url

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { runDirectoryUrlIngest } from "@/lib/intelligence/salon/source-ingest/directory-ingest-engine";

const RequestSchema = z.object({
  url: z.string().min(8),
  market: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
  fullScroll: z.boolean().optional(),
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

    const result = await runDirectoryUrlIngest(parsed.data);

    return NextResponse.json({
      ok: result.ok,
      sourceType: "directory",
      provider: result.provider,
      providerLabel: result.providerLabel,
      directoryUrl: result.directoryUrl,
      sourceProvider: result.sourceProvider,
      slug: result.slug ?? result.solaSlug,
      solaSlug: result.solaSlug,
      listingsFound: result.listingsFound,
      profilesEnriched: result.profilesEnriched,
      resolverCandidatesCreated: result.resolverCandidatesCreated,
      marketCandidatesCreated: result.marketCandidatesCreated,
      harvestSucceeded: result.harvestSucceeded,
      promotionSucceeded: result.promotionSucceeded,
      promotionStatus: result.promotionStatus,
      artifactPaths: result.artifactPaths,
      nextLinks: result.nextLinks,
      market: result.market,
      category: result.category,
      candidatesFound: result.candidatesFound,
      candidatesCreated: result.candidatesCreated,
      staticCandidatesFound: result.staticCandidatesFound,
      browserCandidatesFound: result.browserCandidatesFound,
      scrollModeUsed: result.scrollModeUsed,
      scrollAttempts: result.scrollAttempts,
      browserAvailable: result.browserAvailable,
      duplicates: result.duplicates,
      warnings: result.warnings,
      errors: result.errors,
      ingestRunId: result.ingestRunId,
      notes: result.notes,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "directory ingest failed", detail, warnings: [], errors: [detail] },
      { status: 500 },
    );
  }
}
