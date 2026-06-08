export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  deleteEvidenceOverride,
  readEvidenceOverrides,
  upsertEvidenceOverride,
} from "@/lib/transpo/evidence-override-store";
import type { EvidenceStatus } from "@/lib/transpo/evidence-types";

export async function GET() {
  try {
    const store = await readEvidenceOverrides();
    return NextResponse.json({
      ok: true,
      overrides: store.overrides,
      total: store.overrides.length,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "evidence overrides read failed", detail },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const countyKey = body.countyKey as string | undefined;
    const county = body.county as string | undefined;
    const state = body.state as string | undefined;
    const evidenceKey = body.evidenceKey as string | undefined;
    const status = (body.status ?? "known") as EvidenceStatus;

    if (!countyKey || !county || !state || !evidenceKey) {
      return NextResponse.json(
        { ok: false, error: "countyKey, county, state, evidenceKey required" },
        { status: 400 },
      );
    }

    const override = await upsertEvidenceOverride({
      countyKey,
      county,
      state,
      evidenceKey,
      status,
      value: body.value,
      source: body.source,
      sourceUrl: body.sourceUrl,
      notes: body.notes,
      createdFromTaskId: body.createdFromTaskId,
    });

    return NextResponse.json({ ok: true, override });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "evidence override upsert failed", detail },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const overrideId = request.nextUrl.searchParams.get("overrideId");
    const countyKey = request.nextUrl.searchParams.get("countyKey");
    const evidenceKey = request.nextUrl.searchParams.get("evidenceKey");

    if (!overrideId && !(countyKey && evidenceKey)) {
      return NextResponse.json(
        { ok: false, error: "overrideId or countyKey+evidenceKey required" },
        { status: 400 },
      );
    }

    const removed = await deleteEvidenceOverride({
      overrideId: overrideId ?? undefined,
      countyKey: countyKey ?? undefined,
      evidenceKey: evidenceKey ?? undefined,
    });

    if (!removed) {
      return NextResponse.json({ ok: false, error: "override not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "evidence override delete failed", detail },
      { status: 500 },
    );
  }
}
