// POST /api/trust/create-request — create a pending Trust Unit request and auto-approve creator

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { memberIds, createdBy } = await req.json();
    const uniqueMemberIds = Array.isArray(memberIds) ? Array.from(new Set(memberIds)) : [];

    if (createdBy !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (uniqueMemberIds.length < 3 || !uniqueMemberIds.includes(user.id)) {
      return NextResponse.json({ error: "Trust Units require three members including you" }, { status: 400 });
    }

    const requestId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "trust_unit_requests" (id, "createdById", status, "createdAt")
      VALUES (${requestId}, ${user.id}, 'PENDING'::"TrustUnitRequestStatus", NOW())
    `;

    for (const memberId of uniqueMemberIds) {
      await prisma.$executeRaw`
        INSERT INTO "trust_unit_request_members" (id, "requestId", "userId")
        VALUES (${randomUUID()}, ${requestId}, ${memberId})
        ON CONFLICT ("requestId", "userId") DO NOTHING
      `;
      await prisma.$executeRaw`
        INSERT INTO "trust_unit_approvals" (id, "requestId", "userId", status, "updatedAt")
        VALUES (
          ${randomUUID()},
          ${requestId},
          ${memberId},
          ${memberId === user.id ? "APPROVED" : "PENDING"}::"TrustApprovalStatus",
          NOW()
        )
        ON CONFLICT ("requestId", "userId") DO NOTHING
      `;
    }

    return NextResponse.json({ id: requestId });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("[trust/create-request]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
