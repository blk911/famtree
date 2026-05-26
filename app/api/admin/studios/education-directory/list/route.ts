// app/api/admin/studios/education-directory/list/route.ts
// GET /api/admin/studios/education-directory/list
// Returns run summaries (no full assembler result arrays).

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listDirectoryRunSummaries } from "@/lib/studios/education-directory/store";
import type { DirectoryListResponse, DirectoryErrorResponse } from "@/lib/studios/education-directory/types";

export async function GET() {
  try {
    const runs = await listDirectoryRunSummaries();
    return NextResponse.json(
      { ok: true, runs, total: runs.length } satisfies DirectoryListResponse
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[education-directory/list] error:", msg);
    return NextResponse.json(
      { ok: false, error: "Failed to load directory runs", detail: msg } satisfies DirectoryErrorResponse,
      { status: 500 }
    );
  }
}
