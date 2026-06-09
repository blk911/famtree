export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import type { ReportTargetStatus } from "@/lib/intelligence/reporting/target-types";
import {
  readReportTargetsArtifact,
  readRequestPackagesArtifact,
  readRequestTemplatesArtifact,
} from "@/lib/intelligence/reporting/read-targets";
import { updateReportTargetState } from "@/lib/intelligence/reporting/report-target-state";

const VALID_STATUSES: ReportTargetStatus[] = [
  "identified",
  "request_ready",
  "requested",
  "acquired",
  "failed",
];

export async function GET() {
  try {
    const [targets, packages, templates] = await Promise.all([
      readReportTargetsArtifact(),
      readRequestPackagesArtifact(),
      readRequestTemplatesArtifact(),
    ]);

    if (!targets) {
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
      packages,
      templates,
      summary: {
        total: targets.total,
        requestReady: targets.summary.requestReady,
        requested: targets.summary.requested,
        acquired: targets.summary.acquired,
        failed: targets.summary.failed,
      },
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "live targets failed", detail },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      targetKey?: string;
      status?: ReportTargetStatus;
      notes?: string;
    };

    if (!body.targetKey) {
      return NextResponse.json({ ok: false, error: "targetKey required" }, { status: 400 });
    }

    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ ok: false, error: "invalid status" }, { status: 400 });
    }

    const state = await updateReportTargetState(body.targetKey, {
      status: body.status,
      notes: body.notes,
    });

    return NextResponse.json({ ok: true, state });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "failed to update target state", detail },
      { status: 500 },
    );
  }
}
