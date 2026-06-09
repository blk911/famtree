export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  readAuditFindingsArtifact,
  readKpiRegistryArtifact,
  readOperationalStressSignalsArtifact,
  readRequiredReportsArtifact,
} from "@/lib/intelligence/reporting/read-reporting-registry";

export async function GET() {
  try {
    const [requiredReports, kpiRegistry, auditFindings, stressSignals] = await Promise.all([
      readRequiredReportsArtifact(),
      readKpiRegistryArtifact(),
      readAuditFindingsArtifact(),
      readOperationalStressSignalsArtifact(),
    ]);

    if (!requiredReports) {
      return NextResponse.json(
        {
          ok: false,
          error: "reporting registry not built",
          detail: "Run npm run build:reporting",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      requiredReports,
      kpiRegistry,
      auditFindings,
      stressSignals,
      summary: {
        reports: requiredReports.total,
        discovered: requiredReports.discovered,
        kpis: kpiRegistry?.total ?? 0,
        auditFindings: auditFindings?.total ?? 0,
        stressSignals: stressSignals?.total ?? 0,
      },
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "reporting registry failed", detail },
      { status: 500 },
    );
  }
}
