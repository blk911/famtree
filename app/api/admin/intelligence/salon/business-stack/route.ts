// GET /api/admin/intelligence/salon/business-stack

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { listBusinessStacks } from "@/lib/intelligence/salon/business-stack/stack-store";
import { filterProspects } from "@/lib/studios/prospects/store";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const limit = Math.min(500, Math.max(1, Number(sp.get("limit") ?? 200)));
    const prospectId = sp.get("prospectId") ?? undefined;

    const stacks = await listBusinessStacks({ limit, prospectId });
    const prospects = await filterProspects({ vertical: "salon" });
    const byId = new Map(prospects.map((p) => [p.prospectId, p]));

    const rows = stacks.map((s) => ({
      ...s,
      handle: byId.get(s.prospectId ?? "")?.identity.handle,
      name: byId.get(s.prospectId ?? "")?.identity.name,
    }));

    return NextResponse.json({ ok: true, stacks: rows, total: rows.length });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "list stacks failed", detail },
      { status: 500 },
    );
  }
}
