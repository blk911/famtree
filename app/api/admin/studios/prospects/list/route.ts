// app/api/admin/studios/prospects/list/route.ts
// GET /api/admin/studios/prospects/list
// Returns prospect records with optional query-param filtering.
// Admin-only. Not exposed to members.
//
// Query params (all optional):
//   vertical         — e.g. "education"
//   educationType    — e.g. "homeschool"
//   audienceType     — e.g. "parent"
//   sourceHashtag    — e.g. "homeschoolmom"  (no #)
//   validationStatus — e.g. "needs_review"
//   platform         — e.g. "glossgenius"
//   location         — substring match on locationGuess
//   minConfidence    — integer 0-100
//   sourceType       — e.g. "education_directory_import"
//   sourcePlatform   — e.g. "directory_import"
//   sourceTool       — e.g. "hashtag_harvest"
//   runId            — exact run ID match

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { filterProspects, getStoreBackendInfo } from "@/lib/studios/prospects/store";
import type { ProspectListResponse, ProspectErrorResponse } from "@/lib/studios/prospects/types";

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw === null) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function collectWarnings(prospects: ProspectListResponse["prospects"], backend: string): string[] {
  const warnings: string[] = [];
  const missingFingerprints = prospects.filter((p) => !p.identityFingerprint).length;
  const duplicatedSourcePaths = prospects.filter((p) => / \/ ([^/]+ Import) \/ .*?\1/.test(p.sourcePath)).length;

  if (backend === "json") warnings.push("Using JSON prospect store fallback");
  if (missingFingerprints > 0) warnings.push(`${missingFingerprints} prospect(s) are missing identityFingerprint`);
  if (duplicatedSourcePaths > 0) warnings.push(`${duplicatedSourcePaths} prospect(s) have duplicated sourcePath labels`);
  return warnings;
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;

    const minConf = sp.get("minConfidence");
    const pageSize = clampInt(sp.get("pageSize") ?? sp.get("limit"), 100, 1, 500);
    const page = clampInt(sp.get("page"), 1, 1, 1000000);
    const offset = sp.has("offset")
      ? clampInt(sp.get("offset"), 0, 0, 1000000)
      : (page - 1) * pageSize;
    const backendInfo = await getStoreBackendInfo();

    const prospects = await filterProspects({
      vertical:        sp.get("vertical")         ?? undefined,
      educationType:   sp.get("educationType")    ?? undefined,
      audienceType:    sp.get("audienceType")      ?? undefined,
      sourceHashtag:   sp.get("sourceHashtag")    ?? undefined,
      validationStatus:sp.get("validationStatus") ?? undefined,
      platform:        sp.get("platform")          ?? undefined,
      location:        sp.get("location")          ?? undefined,
      minConfidence:   minConf !== null ? Number(minConf) : undefined,
      sourceType:      sp.get("sourceType")        ?? undefined,
      sourcePlatform:  sp.get("sourcePlatform")    ?? undefined,
      sourceTool:      sp.get("sourceTool")         ?? undefined,
      runId:           sp.get("runId")             ?? undefined,
    });
    const items = prospects.slice(offset, offset + pageSize);
    const totalPages = Math.max(1, Math.ceil(prospects.length / pageSize));

    return NextResponse.json(
      {
        ok: true,
        items,
        prospects: items,
        total: prospects.length,
        page,
        pageSize,
        totalPages,
        selectedBackend: backendInfo.backend,
        backendInfo,
        pagination: {
          limit: pageSize,
          offset,
          returned: items.length,
          hasMore: offset + items.length < prospects.length,
        },
        backend: backendInfo.backend,
        storePath: backendInfo.storePath,
        warnings: collectWarnings(prospects, backendInfo.backend),
      } satisfies ProspectListResponse
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[prospects/list] error:", msg);
    return NextResponse.json(
      { ok: false, error: "Failed to load prospects", detail: msg } satisfies ProspectErrorResponse,
      { status: 500 }
    );
  }
}
