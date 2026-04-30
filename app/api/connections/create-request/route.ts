// POST /api/connections/create-request — request a direct connection with an existing member

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { targetUserId } = await req.json();

    if (!targetUserId || targetUserId === user.id) {
      return NextResponse.json({ error: "Invalid connection target" }, { status: 400 });
    }

    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "connection_requests"
      WHERE "requesterId" = ${user.id}
        AND "targetId" = ${targetUserId}
      LIMIT 1
    `;

    const id = existing[0]?.id ?? randomUUID();
    if (!existing[0]) {
      await prisma.$executeRaw`
        INSERT INTO "connection_requests" (id, "requesterId", "targetId", status, "createdAt", "updatedAt")
        VALUES (${id}, ${user.id}, ${targetUserId}, 'PENDING'::"ConnectionRequestStatus", NOW(), NOW())
      `;
    }

    return NextResponse.json({ id });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
