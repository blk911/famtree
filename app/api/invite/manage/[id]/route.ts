// app/api/invite/manage/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

const isAdmin = (role: string) => role === "founder" || role === "admin";

// PATCH — cancel a pending invite (sender or admin)
export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const invite = await prisma.invite.findUnique({ where: { id: params.id } });

    if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (invite.senderId !== user.id && !isAdmin(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (invite.status !== "PENDING") return NextResponse.json({ error: "Only pending invites can be cancelled" }, { status: 400 });

    await prisma.invite.update({ where: { id: params.id }, data: { status: "CANCELLED" } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    console.error("[invite/manage PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — permanently remove an invite
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const invite = await prisma.invite.findUnique({ where: { id: params.id } });

    if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (invite.senderId !== user.id && !isAdmin(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.invite.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    console.error("[invite/manage DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
