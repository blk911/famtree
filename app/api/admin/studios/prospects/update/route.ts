// app/api/admin/studios/prospects/update/route.ts
// POST /api/admin/studios/prospects/update
// Updates status, validationStatus, archiveReason, and/or notes on a prospect record.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateProspect } from "@/lib/studios/prospects/store";
import type { ProspectUpdateResponse, ProspectErrorResponse } from "@/lib/studios/prospects/types";

const VALID_STATUSES = [
  "new", "reviewed", "good_fit", "maybe", "bad_fit",
  "contacted", "registered", "claimed", "converted",
] as const;

const VALID_VALIDATION_STATUSES = [
  "new", "needs_review", "valid", "active", "education_relevant",
  "not_education", "dead_link", "duplicate", "priority", "archive",
] as const;

const UpdateSchema = z.object({
  prospectId:        z.string().min(1).max(120),
  status:            z.enum(VALID_STATUSES).optional(),
  validationStatus:  z.enum(VALID_VALIDATION_STATUSES).optional(),
  notes:             z.string().max(2000).optional(),
  archiveReason:     z.string().max(120).nullable().optional(),
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

  const { prospectId, status, validationStatus, notes, archiveReason } = parsed.data;

  if (!status && !validationStatus && notes === undefined && archiveReason === undefined) {
    return err("Nothing to update — provide at least one field");
  }

  try {
    const updated = await updateProspect(prospectId, {
      ...(status            !== undefined ? { status }            : {}),
      ...(validationStatus  !== undefined ? { validationStatus }  : {}),
      ...(notes             !== undefined ? { notes }             : {}),
      ...(archiveReason     !== undefined ? { archiveReason }     : {}),
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
