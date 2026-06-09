export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import type { AcquisitionStatus } from "@/lib/intelligence/reporting/acquisition-types";
import {
  readExtractedFailureSignalsArtifact,
  readReportAcquisitionArtifact,
  readRecordsRequestTargetsArtifact,
} from "@/lib/intelligence/reporting/read-acquisition";
import { updateReportAcquisitionState } from "@/lib/intelligence/reporting/report-acquisition-state";

const VALID_STATUSES: AcquisitionStatus[] = [
  "not_started",
  "discovered",
  "requested",
  "acquired",
  "failed",
];

export async function GET() {
  try {
    const [acquisition, failureSignals, recordsTargets] = await Promise.all([
      readReportAcquisitionArtifact(),
      readExtractedFailureSignalsArtifact(),
      readRecordsRequestTargetsArtifact(),
    ]);

    if (!acquisition) {
      return NextResponse.json(
        {
          ok: false,
          error: "report acquisition not built",
          detail: "Run npm run build:reporting:acquisition",
        },
        { status: 404 },
      );
    }

    const pending =
      acquisition.summary.discovered + acquisition.summary.requested + acquisition.summary.notStarted;

    return NextResponse.json({
      ok: true,
      acquisition,
      failureSignals,
      recordsTargets,
      summary: {
        sources: acquisition.sources.length,
        acquired: acquisition.summary.acquired,
        pending,
        failureSignals: failureSignals?.total ?? 0,
      },
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "report acquisition failed", detail },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      sourceKey?: string;
      acquisitionStatus?: AcquisitionStatus;
      notes?: string;
    };

    if (!body.sourceKey) {
      return NextResponse.json({ ok: false, error: "sourceKey required" }, { status: 400 });
    }

    if (body.acquisitionStatus && !VALID_STATUSES.includes(body.acquisitionStatus)) {
      return NextResponse.json({ ok: false, error: "invalid acquisitionStatus" }, { status: 400 });
    }

    const state = await updateReportAcquisitionState(body.sourceKey, {
      acquisitionStatus: body.acquisitionStatus,
      notes: body.notes,
    });

    return NextResponse.json({ ok: true, state });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "failed to update acquisition state", detail },
      { status: 500 },
    );
  }
}
