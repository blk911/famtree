// POST /api/admin/identity-change/unlock — restore one self-service slot for a member

import { withApiTrace } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/lib/activity/log";
import { z } from "zod";

function isAdmin(role: string) {
  return role === "founder" || role === "admin";
}

const schema = z.object({ userId: z.string().uuid() }).strict();

export async function POST(req: NextRequest) {
  return withApiTrace(req, "/api/admin/identity-change/unlock", async (req: NextRequest) => {

  try {
    const admin = await requireAuth();
    if (!isAdmin(admin.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Expected { userId }" }, { status: 400 });
    }

    const { userId } = parsed.data;

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true, role: true },
    });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (target.role === "founder") {
      return NextResponse.json({ error: "Use policy guidance for founder accounts." }, { status: 403 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { selfServiceIdentityChangesRemaining: 1 },
    });

    await logActivity({
      actorId: admin.id,
      actorName: `${admin.firstName} ${admin.lastName}`,
      action: "identityChange.unlock",
      detail: `Unlocked self-service identity change for ${target.firstName} ${target.lastName} (${target.email})`,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("[identity-change unlock]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  });
}
