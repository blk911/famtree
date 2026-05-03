// app/api/admin/activity/route.ts
// Admin-only: returns the last 200 activity log entries

import { withApiTrace } from "@/lib/trace";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

function isAdmin(role: string) {
  return role === "founder" || role === "admin";
}

export async function GET(req: NextRequest) {
  return withApiTrace(req, "/api/admin/activity", async (req: NextRequest) => {

  try {
    const user = await requireAuth();
    if (!isAdmin(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const logs = await (prisma as any).activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ logs });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  });
}
