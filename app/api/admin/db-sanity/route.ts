// GET /api/admin/db-sanity — founder/admin only: which DB host the server uses + row counts.
// Catches “local .env.production.local ≠ Vercel DATABASE_URL” without leaking passwords.

import { withApiTrace } from "@/lib/trace";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getDatabaseHostHint } from "@/lib/db/databaseHostHint";

function isAdminRole(role: string) {
  return role === "founder" || role === "admin";
}

export async function GET(req: NextRequest) {
  return withApiTrace(req, "/api/admin/db-sanity", async (req: NextRequest) => {
    try {
      const user = await requireAuth();
      if (!isAdminRole(user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const [userCount, inviteCount, pendingInvites] = await Promise.all([
        prisma.user.count(),
        prisma.invite.count(),
        prisma.invite.count({ where: { status: "PENDING" } }),
      ]);

      return NextResponse.json({
        dbHost: getDatabaseHostHint(),
        userCount,
        inviteCount,
        pendingInvites,
        checkedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const e = err as { message?: string };
      if (e.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
      console.error("[admin/db-sanity]", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}
