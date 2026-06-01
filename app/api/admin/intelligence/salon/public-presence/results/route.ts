// GET /api/admin/intelligence/salon/public-presence/results

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { listPresenceResults } from "@/lib/intelligence/salon/public-presence/presence-store";
import { getSearchProviderStatus } from "@/lib/intelligence/salon/public-presence/search-provider";
import { filterProspects } from "@/lib/studios/prospects/store";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const prospectId = sp.get("prospectId") ?? undefined;
    const limit = Math.min(Number(sp.get("limit") ?? 200), 500);

    const results = await listPresenceResults({ prospectId, limit });
    const searchStatus = getSearchProviderStatus();

    const handleById = new Map<string, string>();
    if (!prospectId) {
      const prospects = await filterProspects({ vertical: "salon" });
      for (const p of prospects) {
        handleById.set(p.prospectId, p.identity.handle);
      }
    } else {
      const prospects = await filterProspects({ vertical: "salon" });
      const p = prospects.find((x) => x.prospectId === prospectId);
      if (p) handleById.set(prospectId, p.identity.handle);
    }

    const rows = results.map((r) => ({
      ...r,
      prospectHandle: r.prospectId ? handleById.get(r.prospectId) : undefined,
    }));

    return NextResponse.json({
      ok: true,
      results: rows,
      searchStatus,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "results failed", detail },
      { status: 500 },
    );
  }
}
