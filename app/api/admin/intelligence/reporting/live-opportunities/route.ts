export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { readLiveOpportunityTargetsArtifact } from "@/lib/intelligence/reporting/read-live-opportunities";

export async function GET() {
  try {
    const artifact = await readLiveOpportunityTargetsArtifact();

    if (!artifact) {
      return NextResponse.json(
        {
          ok: false,
          error: "live opportunity targets not built",
          detail: "Run npm run build:reporting:live-opportunities",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      artifact,
      summary: artifact.summary,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "live opportunities failed", detail },
      { status: 500 },
    );
  }
}
