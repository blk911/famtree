// GET /api/admin/intelligence/salon/ggen-discovery/runs

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  getGgenDiscoveryStorePath,
  listGgenDiscoveryRuns,
} from "@/lib/intelligence/salon/ggen-seed-discovery/store";

export async function GET() {
  try {
    const runs = await listGgenDiscoveryRuns();
    return NextResponse.json({
      ok: true,
      runs,
      storePath: getGgenDiscoveryStorePath(),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[ggen-discovery/runs]", detail);
    return NextResponse.json({
      ok: true,
      runs: [],
      storePath: getGgenDiscoveryStorePath(),
      warning: detail,
    });
  }
}
