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
import { filterProspects } from "@/lib/studios/prospects/store";
import type { ProspectListResponse, ProspectErrorResponse } from "@/lib/studios/prospects/types";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;

    const minConf = sp.get("minConfidence");

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

    return NextResponse.json(
      { ok: true, prospects, total: prospects.length } satisfies ProspectListResponse
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
