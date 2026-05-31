// app/api/admin/intelligence/transpo/verification/route.ts
// GET  → all carrier verifications (newest first) + storage metadata
// POST → run verification over selected carriers, upsert, return results
//
// POST body: { carrierIds?: string[], limit?: number, mode?: "all" | "selected" | "missing_only" }
//
// Responses use HTTP 200 with { ok:false, error, debug } for expected failures;
// 500 is reserved for unexpected exceptions. No silent generic failures.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { readCarrierMaster } from "@/lib/intelligence/transpo/carrier-master-store";
import {
  readCarrierVerifications,
  upsertCarrierVerifications,
  getVerificationStorePath,
} from "@/lib/intelligence/transpo/verification-store";
import { verifyCarriers } from "@/lib/intelligence/transpo/verification-engine";
import { getTranspoBackendInfo } from "@/lib/intelligence/transpo/db";

function toTime(value: unknown): number {
  if (typeof value !== "string") return 0;
  const t = Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
}

async function storageInfo() {
  const info = await getTranspoBackendInfo();
  const path =
    info.backend === "postgres"
      ? "postgres:transpo_carrier_verification"
      : getVerificationStorePath();
  const ephemeral = info.backend === "json" && Boolean(process.env.VERCEL);
  return { backend: info.backend, durable: info.durable, path, ephemeral };
}

export async function GET() {
  const verifications = await readCarrierVerifications();
  verifications.sort((a, b) => toTime(b.updatedAt) - toTime(a.updatedAt));
  return NextResponse.json({ ok: true, verifications, storage: await storageInfo() });
}

export async function POST(req: NextRequest) {
  const storePath = getVerificationStorePath();
  try {
    const body = (await req.json().catch(() => ({}))) as {
      carrierIds?: string[];
      limit?: number;
      mode?: "all" | "selected" | "missing_only";
    };
    const mode = body.mode ?? "all";

    const carriers = await readCarrierMaster();
    if (carriers.length === 0) {
      return NextResponse.json({
        ok: false,
        error: "No carriers in the carrier master to verify. Promote/resolve carriers first.",
        debug: { mode, carrierCount: 0, storePath },
      });
    }

    let selected = carriers;
    if (mode === "selected") {
      const idSet = new Set(body.carrierIds ?? []);
      selected = carriers.filter((c) => idSet.has(c.id));
      if (selected.length === 0) {
        return NextResponse.json({
          ok: false,
          error: "No matching carriers for the provided carrierIds.",
          debug: { mode, requestedIds: body.carrierIds?.length ?? 0, carrierCount: carriers.length, storePath },
        });
      }
    } else if (mode === "missing_only") {
      const existing = await readCarrierVerifications();
      const verifiedIds = new Set(existing.map((v) => v.carrierId));
      selected = carriers.filter((c) => !verifiedIds.has(c.id));
      if (selected.length === 0) {
        return NextResponse.json({
          ok: true,
          verified: 0,
          created: 0,
          updated: 0,
          verificationCount: existing.length,
          results: [],
          note: "All carriers already have a verification row.",
          storage: await storageInfo(),
        });
      }
    }

    const results = await verifyCarriers(selected, { limit: body.limit });
    const upsert = await upsertCarrierVerifications(results);

    if (upsert.persistError) {
      return NextResponse.json({
        ok: false,
        error: `Verification write failed: ${upsert.persistError}`,
        debug: {
          mode,
          verified: results.length,
          carrierCount: carriers.length,
          storePath: upsert.path,
          persistError: upsert.persistError,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      verified: results.length,
      created: upsert.created,
      updated: upsert.updated,
      verificationCount: upsert.verificationCount,
      results,
      storage: await storageInfo(),
      debug: { mode, carrierCount: carriers.length, storePath: upsert.path },
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "verification run failed", detail, debug: { storePath } },
      { status: 500 },
    );
  }
}
