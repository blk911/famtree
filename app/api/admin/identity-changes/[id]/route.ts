// PATCH /api/admin/identity-changes/[id] — approve | reject

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/lib/activity/log";
import { z } from "zod";
import { applyApprovedRequest, IC_STATUS } from "@/lib/identity-change/service";

function isAdmin(role: string) {
  return role === "founder" || role === "admin";
}

const patchSchema = z
  .object({
    decision: z.enum(["approve", "reject"]),
    adminNote: z.string().max(2000).optional(),
  })
  .strict();

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAuth();
    if (!isAdmin(admin.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const { decision, adminNote } = parsed.data;
    const id = params.id;

    const row = await prisma.identityChangeRequest.findFirst({
      where: { id, status: IC_STATUS.PENDING_ADMIN },
      include: { requester: { select: { firstName: true, lastName: true, email: true } } },
    });
    if (!row) {
      return NextResponse.json({ error: "Request not in admin queue" }, { status: 404 });
    }

    const actorLabel = `${admin.firstName} ${admin.lastName}`;

    if (decision === "reject") {
      await prisma.identityChangeRequest.update({
        where: { id },
        data: {
          status: IC_STATUS.REJECTED,
          resolvedAt: new Date(),
          adminId: admin.id,
          adminNote: adminNote ?? null,
        },
      });

      await logActivity({
        actorId: admin.id,
        actorName: actorLabel,
        action: "identityChange.reject",
        detail: `Rejected identity change for ${row.requester.firstName} ${row.requester.lastName} (${row.requester.email})`,
      });

      return NextResponse.json({ success: true });
    }

    try {
      await applyApprovedRequest(id, admin.id, adminNote ?? null);
    } catch (e: any) {
      if (e?.message === "EMAIL_TAKEN") {
        return NextResponse.json({ error: "Proposed email is already used by another account." }, { status: 409 });
      }
      if (e?.message === "BAD_STATE") {
        return NextResponse.json({ error: "Request is no longer pending admin review." }, { status: 409 });
      }
      throw e;
    }

    await logActivity({
      actorId: admin.id,
      actorName: actorLabel,
      action: "identityChange.approve",
      detail: `Approved identity change for ${row.requester.firstName} ${row.requester.lastName} (${row.requester.email})`,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("[admin identity-changes PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
