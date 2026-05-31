// app/api/admin/studios/prospects/clear-all/route.ts
// POST /api/admin/studios/prospects/clear-all
// Admin-only. Fresh Slate — wipes the canonical Salon / Client-Centric prospect
// store (the single source the Prospects table reads). Works on whichever store
// backend is active (JSON file or Postgres `studio_prospects`).
//
// Scope guard: only "salon" / "client-centric" are allowed. Transpo and HCare
// use separate stores under runtime-data/intelligence/* and are never touched.
//
// Two-phase design — the client calls twice:
//   Phase 1: body { confirm: false }  → { ok, phase: "count", count }
//   Phase 2: body { confirm: true }   → { ok, phase: "cleared", cleared[], remainingCounts }

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  countProspects,
  clearAllProspects,
  getStoreBackendInfo,
} from "@/lib/studios/prospects/store";

// Salon / Client-Centric only. Transpo & HCare are explicitly out of scope.
const ALLOWED_VERTICALS = new Set(["salon", "client-centric"]);
const PAGE_SIZE = 100;

type ClearedArtifact = { path: string; existed: boolean; action: string };

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      confirm?: boolean;
      vertical?: string;
    };

    // Default to salon; reject anything outside the salon/client-centric scope.
    const vertical = (body.vertical ?? "salon").toLowerCase();
    if (!ALLOWED_VERTICALS.has(vertical)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Fresh Slate is restricted to the Salon / Client-Centric vertical. Refusing vertical "${vertical}".`,
        },
        { status: 400 },
      );
    }

    const confirmed = body.confirm === true;
    const backendInfo = await getStoreBackendInfo();
    const storeLabel =
      backendInfo.backend === "postgres"
        ? "postgres:studio_prospects"
        : backendInfo.storePath ?? "runtime-data/studios/prospects/prospects.json";

    if (!confirmed) {
      // Phase 1 — count only, no write
      const count = await countProspects();
      return NextResponse.json({
        ok: true,
        phase: "count",
        count,
        backend: backendInfo.backend,
      });
    }

    // Phase 2 — wipe the canonical salon/client-centric prospect store.
    const before = await countProspects();
    const removed = await clearAllProspects();
    const remaining = await countProspects();

    const cleared: ClearedArtifact[] = [
      {
        path: storeLabel,
        existed: before > 0,
        action:
          before > 0
            ? `cleared ${removed} prospect record${removed === 1 ? "" : "s"}`
            : "already empty",
      },
    ];

    return NextResponse.json({
      ok: true,
      phase: "cleared",
      vertical,
      backend: backendInfo.backend,
      cleared,
      remainingCounts: {
        prospects: remaining,
        matching: remaining,
        shown: Math.min(remaining, PAGE_SIZE),
      },
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "Fresh Slate clear failed", detail },
      { status: 500 },
    );
  }
}
