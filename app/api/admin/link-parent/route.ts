// app/api/admin/link-parent/route.ts
// Admin-only: set invitedById on a user to repair broken tree placement

import { withApiTrace } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const isAdmin = (role: string) => role === "founder" || role === "admin";

const schema = z.object({
  userId:   z.string().uuid(),  // the orphan member
  parentId: z.string().uuid(),  // who invited them
});

export async function PATCH(req: NextRequest) {
  return withApiTrace(req, "/api/admin/link-parent", async (req: NextRequest) => {

  const actor = await getCurrentUser();
  if (!actor || !isAdmin(actor.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "userId and parentId (UUIDs) are required" }, { status: 400 });
  }

  const { userId, parentId } = parsed.data;

  if (userId === parentId) {
    return NextResponse.json({ error: "A user cannot be their own parent" }, { status: 400 });
  }

  const [child, parent] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id:true, firstName:true, lastName:true } }),
    prisma.user.findUnique({ where: { id: parentId }, select: { id:true, firstName:true, lastName:true } }),
  ]);

  if (!child || !parent) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: userId },
    data:  { invitedById: parentId },
  });

  return NextResponse.json({ success: true, child, parent });
  });
}
