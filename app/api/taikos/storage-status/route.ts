export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getTaikosStorageStats } from "@/lib/taikos/storage/taikos-storage-stats";

export async function GET() {
  const stats = await getTaikosStorageStats();
  return NextResponse.json({
    ok: true,
    data: {
      backend: stats.backend,
      durable: stats.durable,
      databaseUrlPresent: stats.databaseUrlPresent,
      databaseConnected: stats.databaseConnected,
      vercel: stats.vercel,
      queueCount: stats.queueCount,
      draftCount: stats.draftCount,
      goalCount: stats.goalCount,
      activityCount: stats.activityCount,
      sessionCount: stats.sessionCount,
      note: stats.note,
    },
  });
}
