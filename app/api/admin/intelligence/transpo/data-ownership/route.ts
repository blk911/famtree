export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  readColoradoNemtWorkflow,
  readDataAccessPaths,
  readDataOwnershipRegistry,
  readHighValueDataTargets,
} from "@/lib/transpo/read-data-ownership";

export async function GET() {
  try {
    const [registry, workflow, accessPaths, highValueTargets] = await Promise.all([
      readDataOwnershipRegistry(),
      readColoradoNemtWorkflow(),
      readDataAccessPaths(),
      readHighValueDataTargets(),
    ]);

    if (!registry) {
      return NextResponse.json(
        {
          ok: false,
          error: "data ownership registry not built",
          detail: "Run npm run build:transpo:data-ownership",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      registry,
      workflow,
      accessPaths,
      highValueTargets,
      summary: {
        ownershipRecords: registry.total,
        knownSystems: registry.summary.knownSystems.length,
        publicSources: registry.summary.publicSources,
        highValueTargets: highValueTargets?.total ?? 0,
      },
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "data ownership failed", detail },
      { status: 500 },
    );
  }
}
