export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getVmbAnalysisStorageBackend } from "@/lib/vmb/book-analysis/analysis-store";
import { vmbDatabaseUrlPresent } from "@/lib/vmb/db";
import { getVmbDataDir } from "@/lib/vmb/paths";

/** Lightweight prod-safe storage probe for VMB unlock debugging. */
export async function GET() {
  const backend = await getVmbAnalysisStorageBackend();
  return NextResponse.json({
    ok: true,
    data: {
      backend,
      databaseUrlPresent: vmbDatabaseUrlPresent(),
      vercel: Boolean(process.env.VERCEL),
      dataDir: getVmbDataDir(),
      durable: backend === "postgres",
      note:
        backend === "json" && process.env.VERCEL
          ? "VMB analysis is ephemeral on this deploy (/tmp). Today unlock requires postgres backend."
          : null,
    },
  });
}
