export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { classifyProviderFootprint } from "@/lib/transpo/normalize-provider-capacity";
import {
  readCountyCapacityArtifact,
  readProviderCapacityArtifact,
} from "@/lib/transpo/read-provider-registry";

export async function GET(request: NextRequest) {
  try {
    const registry = await readProviderCapacityArtifact();
    const capacity = await readCountyCapacityArtifact();

    if (!registry) {
      return NextResponse.json(
        {
          ok: false,
          error: "provider registry not built",
          detail: "Run npm run build:transpo",
        },
        { status: 404 },
      );
    }

    const county = request.nextUrl.searchParams.get("county");
    const state = (request.nextUrl.searchParams.get("state") ?? "CO").toUpperCase();

    let providers = registry.providers;

    if (county) {
      const countyNorm = county.trim().replace(/\s+county$/i, "");
      providers = providers.filter((p) =>
        p.countiesServed.some((c) => c.toLowerCase() === countyNorm.toLowerCase()),
      );
    }

    const regionalProviders = registry.providers.filter(
      (p) => classifyProviderFootprint(p.countyCount) === "regional",
    ).length;
    const statewideProviders = registry.providers.filter(
      (p) => classifyProviderFootprint(p.countyCount) === "statewide",
    ).length;

    let countyCapacity = capacity?.counties ?? [];
    if (county) {
      const countyNorm = county.trim().replace(/\s+county$/i, "");
      countyCapacity = countyCapacity.filter(
        (c) => c.county.toLowerCase() === countyNorm.toLowerCase() && c.state === state,
      );
    }

    return NextResponse.json({
      ok: true,
      summary: {
        totalProviders: registry.totalProviders,
        countiesCovered: capacity?.totalCounties ?? 0,
        regionalProviders,
        statewideProviders,
        generatedAt: registry.generatedAt,
      },
      providers,
      countyCapacity,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "provider capacity failed", detail },
      { status: 500 },
    );
  }
}
