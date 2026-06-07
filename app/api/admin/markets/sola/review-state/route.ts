// app/api/admin/markets/sola/review-state/route.ts

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  readSolaReviewStates,
  upsertSolaReviewState,
} from "@/lib/operators/sources/sola/sola-review-state-store";
import { SOLA_REVIEW_STATUSES, type SolaReviewStatus } from "@/lib/operators/sources/sola/types";

function isAdmin(role: string): boolean {
  return role === "founder" || role === "admin";
}

export async function GET() {
  try {
    const user = await requireAuth();
    if (!isAdmin(user.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const states = await readSolaReviewStates();
    return NextResponse.json({ ok: true, states });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "read failed", detail }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    if (!isAdmin(user.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      candidateKey?: string;
      reviewStatus?: string;
      notes?: string;
    };

    const candidateKey = body.candidateKey?.trim();
    if (!candidateKey) {
      return NextResponse.json({ ok: false, error: "candidateKey required" }, { status: 400 });
    }

    const reviewStatus = body.reviewStatus as SolaReviewStatus | undefined;
    if (!reviewStatus || !SOLA_REVIEW_STATUSES.includes(reviewStatus)) {
      return NextResponse.json({ ok: false, error: "invalid reviewStatus" }, { status: 400 });
    }

    const reviewedBy = user.email || user.id;
    const { states, state } = await upsertSolaReviewState({
      candidateKey,
      reviewStatus,
      notes: body.notes,
      reviewedBy,
    });

    return NextResponse.json({ ok: true, state, states });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "update failed", detail }, { status: 500 });
  }
}
