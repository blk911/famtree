// app/api/admin/studios/prospects/update/route.ts
// POST /api/admin/studios/prospects/update
// Updates status and/or notes on a prospect record.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateProspect } from "@/lib/studios/prospects/store";
import type { ProspectUpdateResponse, ProspectErrorResponse } from "@/lib/studios/prospects/types";

const VALID_STATUSES = [
  "new", "reviewed", "good_fit", "maybe", "bad_fit",
  "contacted", "registered", "claimed", "converted",
] as const;

const UpdateSchema = z.object({
  prospectId: z.string().min(1).max(120),
  status: z.enum(VALID_STATUSES).optional(),
  notes: z.string().max(2000).optional(),
});

function err(error: string, detail?: string, status = 400) {
  return NextResponse.json({ ok: false, error, detail } satisfies ProspectErrorResponse, { status });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON body");
  }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return err("Validation error", parsed.error.errors[0]?.message);
  }

  const { prospectId, status, notes } = parsed.data;

  if (!status && notes === undefined) {
    return err("Nothing to update — provide status and/or notes");
  }

  try {
    const updated = await updateProspect(prospectId, {
      ...(status !== undefined ? { status } : {}),
      ...(notes !== undefined ? { notes } : {}),
    });

    if (!updated) {
      return err("Prospect not found", undefined, 404);
    }

    return NextResponse.json({ ok: true, prospect: updated } satisfies ProspectUpdateResponse);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[prospects/update] error:", msg);
    return err("Failed to update prospect", msg, 500);
  }
}
