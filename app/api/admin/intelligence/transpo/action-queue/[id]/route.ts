export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  ACTION_DECISIONS,
  ACTION_STATUSES,
  updateActionRecord,
} from "@/lib/intelligence/transpo/action-queue/action-engine";
import { readActionQueue, writeActionQueue } from "@/lib/intelligence/transpo/action-queue/action-store";
import type { TranspoActionDecision, TranspoActionStatus } from "@/lib/intelligence/transpo/action-queue/action-types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const records = await readActionQueue();
    const record = records.find((r) => r.id === id);
    if (!record) {
      return NextResponse.json({ ok: false, error: "action not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, record });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "action get failed", detail }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as {
      decision?: string;
      status?: string;
      notes?: string;
    };

    const records = await readActionQueue();
    const idx = records.findIndex((r) => r.id === id);
    if (idx < 0) {
      return NextResponse.json({ ok: false, error: "action not found" }, { status: 404 });
    }

    const patch: Partial<{ decision: TranspoActionDecision; status: TranspoActionStatus; notes: string }> = {};
    if (body.decision !== undefined) {
      if (!ACTION_DECISIONS.includes(body.decision as TranspoActionDecision)) {
        return NextResponse.json({ ok: false, error: "invalid decision" }, { status: 400 });
      }
      patch.decision = body.decision as TranspoActionDecision;
    }
    if (body.status !== undefined) {
      if (!ACTION_STATUSES.includes(body.status as TranspoActionStatus)) {
        return NextResponse.json({ ok: false, error: "invalid status" }, { status: 400 });
      }
      patch.status = body.status as TranspoActionStatus;
    }
    if (body.notes !== undefined) patch.notes = String(body.notes);

    const updated = updateActionRecord(records[idx], patch);
    records[idx] = updated;
    const persistWarning = (await writeActionQueue(records)) ?? undefined;

    return NextResponse.json({
      ok: true,
      record: updated,
      ...(persistWarning ? { persistWarning } : {}),
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "action update failed", detail }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const soft =
      request.nextUrl.searchParams.get("soft") === "true" ||
      request.nextUrl.searchParams.get("soft") === "1";

    const records = await readActionQueue();
    const idx = records.findIndex((r) => r.id === id);
    if (idx < 0) {
      return NextResponse.json({ ok: false, error: "action not found" }, { status: 404 });
    }

    if (soft) {
      records[idx] = updateActionRecord(records[idx], { status: "closed" });
      await writeActionQueue(records);
      return NextResponse.json({ ok: true, softDeleted: true, record: records[idx] });
    }

    records.splice(idx, 1);
    await writeActionQueue(records);
    return NextResponse.json({ ok: true, deleted: true });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "action delete failed", detail }, { status: 500 });
  }
}
