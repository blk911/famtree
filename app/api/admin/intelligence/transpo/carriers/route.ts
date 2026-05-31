// app/api/admin/intelligence/transpo/carriers/route.ts
// GET /api/admin/intelligence/transpo/carriers
// Returns the carrier master list, newest-updated first.
//
// Response: { ok: true, carriers: TranspoCarrierTarget[] }

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { readCarrierMaster } from "@/lib/intelligence/transpo/carrier-master-store";

function toTime(value: unknown): number {
  if (typeof value !== "string") return 0;
  const t = Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
}

export async function GET() {
  const carriers = await readCarrierMaster();
  carriers.sort((a, b) => toTime(b.updatedAt) - toTime(a.updatedAt));
  return NextResponse.json({ ok: true, carriers });
}
