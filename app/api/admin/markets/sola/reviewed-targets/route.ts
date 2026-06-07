// app/api/admin/markets/sola/reviewed-targets/route.ts

import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  SOLA_REVIEWED_TARGETS_CSV_PATH,
  SOLA_REVIEWED_TARGETS_JSON_PATH,
} from "@/lib/operators/sources/sola/export-reviewed-targets";

function isAdmin(role: string): boolean {
  return role === "founder" || role === "admin";
}

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    if (!isAdmin(user.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "csv";

    if (format === "json") {
      const raw = await readFile(SOLA_REVIEWED_TARGETS_JSON_PATH, "utf8");
      return new NextResponse(raw, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": 'attachment; filename="sola-reviewed-targets.generated.json"',
        },
      });
    }

    const raw = await readFile(SOLA_REVIEWED_TARGETS_CSV_PATH, "utf8");
    return new NextResponse(raw, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="sola-reviewed-targets.csv"',
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "export not found", detail, command: "npm run export:sola:reviewed" },
      { status: 404 },
    );
  }
}
