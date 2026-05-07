// POST /api/admin/members/password-reset — founder/admin emails a reset link to a member.

import { withApiTrace } from "@/lib/trace";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { issuePasswordResetForUser } from "@/lib/auth/password-reset";
import { logActivity } from "@/lib/activity/log";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const schema = z.object({ userId: z.string().uuid() }).strict();

function isAdmin(role: string) {
  return role === "founder" || role === "admin";
}

export async function POST(req: NextRequest) {
  return withApiTrace(req, "/api/admin/members/password-reset", async () => {
    try {
      const caller = await requireAuth();
      if (!isAdmin(caller.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const raw = await req.json();
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
      }

      const target = await prisma.user.findUnique({
        where: { id: parsed.data.userId },
        select: { id: true, email: true, firstName: true, lastName: true, status: true },
      });
      if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
      if (target.status !== "active") {
        return NextResponse.json(
          { error: "Member must be active to receive a reset email" },
          { status: 400 },
        );
      }

      const ok = await issuePasswordResetForUser(target.id);
      if (!ok) return NextResponse.json({ error: "User not found" }, { status: 404 });

      await logActivity({
        actorId: caller.id,
        actorName: `${caller.firstName} ${caller.lastName}`,
        action: "member.password_reset_email",
        detail: `Sent password reset email to ${target.firstName} ${target.lastName} (${target.email})`,
      });

      return NextResponse.json({ success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
      console.error("[admin password-reset]", err);
      return NextResponse.json({ error: "Could not send reset email" }, { status: 500 });
    }
  });
}
