export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { readReportTargetsArtifact, readTopAcquisitionTargets } from "@/lib/intelligence/reporting/read-targets";

export async function GET() {
  try {
    const artifact = await readReportTargetsArtifact();
    const targets = await readTopAcquisitionTargets(5);

    if (!artifact || targets.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "report targets not built",
          detail: "Run npm run build:reporting:acquisition",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      targets,
      requestReadyCount: artifact.summary.requestReady,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "next documents failed", detail },
      { status: 500 },
    );
  }
}
