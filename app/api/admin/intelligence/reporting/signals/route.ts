export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  readExtractedFailureSignalsArtifact,
  readExtractedMetricsArtifact,
} from "@/lib/intelligence/reporting/read-acquisition";

export async function GET() {
  try {
    const [metrics, failureSignals] = await Promise.all([
      readExtractedMetricsArtifact(),
      readExtractedFailureSignalsArtifact(),
    ]);

    if (!failureSignals && !metrics) {
      return NextResponse.json(
        {
          ok: false,
          error: "extraction artifacts not built",
          detail: "Run npm run build:reporting:acquisition",
        },
        { status: 404 },
      );
    }

    const critical = failureSignals?.bySeverity.critical ?? 0;
    const high = failureSignals?.bySeverity.high ?? 0;

    return NextResponse.json({
      ok: true,
      metrics,
      failureSignals,
      summary: {
        metricsExtracted: metrics?.total ?? 0,
        failureSignals: failureSignals?.total ?? 0,
        critical,
        high,
      },
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "signals load failed", detail },
      { status: 500 },
    );
  }
}
