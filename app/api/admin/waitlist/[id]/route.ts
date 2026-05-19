// DELETE /api/admin/waitlist/[id] — remove a waitlist entry (founder | admin)

import { withApiTrace } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/lib/activity/log";

function isAdmin(role: string) {
  return role === "founder" || role === "admin";
}

export async function DELETE(_req: NextRequest, routeCtx: { params: { id: string } }) {
  return withApiTrace(_req, "/api/admin/waitlist/[id]", async (_req: NextRequest, routeCtx) => {
    const { params } = routeCtx;

    try {
      const user = await requireAuth();
      if (!isAdmin(user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const entry = await prisma.waitlist.findUnique({ where: { id: params.id } });
      if (!entry) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      await prisma.waitlist.delete({ where: { id: params.id } });

      await logActivity({
        actorId: user.id,
        actorName: `${user.firstName} ${user.lastName}`,
        action: "waitlist.delete",
        detail: `Removed waitlist entry for ${entry.email}`,
      });

      return NextResponse.json({ success: true });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
      console.error("[admin/waitlist DELETE]", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }, routeCtx);
}
