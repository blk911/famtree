// app/api/admin/members/route.ts
// SITE-WIDE admin actions only (founder | admin role).
// Updates User.status and revokes target sessions — affects login / access for that
// account everywhere. This is NOT the same as /api/tree/view-preference (per-viewer mute/hide).

import { withApiTrace } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/lib/activity/log";
import { deleteMemberAccount } from "@/lib/admin/delete-member-account";
import { z } from "zod";

const patchSchema = z
  .object({
    userId: z.string().uuid(),
    status: z.enum(["active", "suspended", "archived", "blocked"]),
  })
  .strict();

const deleteSchema = z.object({ userId: z.string().uuid() }).strict();

function isAdmin(role: string) {
  return role === "founder" || role === "admin";
}

// PATCH /api/admin/members  { userId, status }
export async function PATCH(req: NextRequest) {
  return withApiTrace(req, "/api/admin/members", async (req: NextRequest) => {

  try {
    const caller = await requireAuth();
    if (!isAdmin(caller.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const raw = await req.json();
    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { userId, status } = parsed.data;

    // Founders cannot be suspended/blocked/archived by anyone
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, firstName: true, lastName: true, email: true },
    });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (target.role === "founder" && status !== "active") {
      return NextResponse.json({ error: "Cannot change founder status" }, { status: 403 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, status: true },
    });

    if (status !== "active") {
      await prisma.session.deleteMany({ where: { userId } });
    }

    await logActivity({
      actorId:   caller.id,
      actorName: `${caller.firstName} ${caller.lastName}`,
      action:    `member.${status}`,
      detail:
        status === "active"
          ? `Reactivated ${target.firstName} ${target.lastName} (${target.email})`
          : status === "archived"
            ? `Archived (legal hold): ${target.firstName} ${target.lastName} (${target.email}) — sessions revoked`
            : `Set ${target.firstName} ${target.lastName} (${target.email}) to ${status} — sessions revoked`,
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  });
}

// DELETE /api/admin/members  { userId } — permanently remove member (invites sent by them, reset tokens, cascaded profile/tree data).
export async function DELETE(req: NextRequest) {
  return withApiTrace(req, "/api/admin/members", async (req: NextRequest) => {
    try {
      const caller = await requireAuth();
      if (!isAdmin(caller.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const raw = await req.json();
      const parsed = deleteSchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
      }

      const { userId } = parsed.data;
      if (caller.id === userId) {
        return NextResponse.json({ error: "Cannot delete your own account" }, { status: 403 });
      }

      const target = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, firstName: true, lastName: true, email: true },
      });
      if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
      if (target.role === "founder") {
        return NextResponse.json({ error: "Cannot delete founder" }, { status: 403 });
      }

      await prisma.$transaction(async (tx) => {
        await deleteMemberAccount(userId, tx);
      });

      await logActivity({
        actorId: caller.id,
        actorName: `${caller.firstName} ${caller.lastName}`,
        action: "member.deleted",
        detail: `Deleted member ${target.firstName} ${target.lastName} (${target.email})`,
      });

      return NextResponse.json({ success: true });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      if (code === "P2003") {
        return NextResponse.json(
          {
            error:
              "Cannot delete this member yet — related Msg Vault or Family Safe records still reference them. Contact engineering.",
          },
          { status: 409 },
        );
      }
      console.error("[DELETE /api/admin/members]", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}
