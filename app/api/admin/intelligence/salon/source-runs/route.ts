// GET /api/admin/intelligence/salon/source-runs

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  getSalonSourceRunsArtifactPath,
  readSalonSourceRuns,
} from "@/lib/studios/source-runs/store";

export async function GET() {
  const artifact = await readSalonSourceRuns();
  return NextResponse.json({
    ok: true,
    runs: artifact.runs,
    artifactPath: getSalonSourceRunsArtifactPath(),
  });
}
