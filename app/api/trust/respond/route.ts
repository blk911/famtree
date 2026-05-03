// POST /api/trust/respond — accept or decline a pending Trust Unit request

import { withApiTrace } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  return withApiTrace(req, "/api/trust/respond", async (req: NextRequest) => {

  try {
    const user = await requireAuth();
    const { requestId, userId, action } = await req.json();

    if (userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!requestId || !["ACCEPT", "DECLINE"].includes(action)) {
      return NextResponse.json({ error: "Invalid response" }, { status: 400 });
    }

    const requestRows = await prisma.$queryRaw<Array<{ id: string; status: string }>>`
      SELECT id, status::text AS status
      FROM "trust_unit_requests"
      WHERE id = ${requestId}
      LIMIT 1
    `;
    const request = requestRows[0];

    if (!request || request.status !== "PENDING") {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const members = await prisma.$queryRaw<Array<{ userId: string }>>`
      SELECT "userId"
      FROM "trust_unit_request_members"
      WHERE "requestId" = ${requestId}
    `;

    if (!members.some((member) => member.userId === user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === "DECLINE") {
      await prisma.$executeRaw`
        INSERT INTO "trust_unit_approvals" (id, "requestId", "userId", status, "updatedAt")
        VALUES (${randomUUID()}, ${requestId}, ${user.id}, 'DECLINED'::"TrustApprovalStatus", NOW())
        ON CONFLICT ("requestId", "userId")
        DO UPDATE SET status = 'DECLINED'::"TrustApprovalStatus", "updatedAt" = NOW()
      `;
      await prisma.$executeRaw`
        UPDATE "trust_unit_requests"
        SET status = 'DECLINED'::"TrustUnitRequestStatus"
        WHERE id = ${requestId}
      `;
      return NextResponse.json({ ok: true });
    }

    await prisma.$executeRaw`
      INSERT INTO "trust_unit_approvals" (id, "requestId", "userId", status, "updatedAt")
      VALUES (${randomUUID()}, ${requestId}, ${user.id}, 'APPROVED'::"TrustApprovalStatus", NOW())
      ON CONFLICT ("requestId", "userId")
      DO UPDATE SET status = 'APPROVED'::"TrustApprovalStatus", "updatedAt" = NOW()
    `;

    const approvals = await prisma.$queryRaw<Array<{ userId: string; status: string }>>`
      SELECT "userId", status::text AS status
      FROM "trust_unit_approvals"
      WHERE "requestId" = ${requestId}
    `;
    const memberIds = members.map((member) => member.userId);
    const allApproved = memberIds.every((id: string) =>
      approvals.some((approval: { userId: string; status: string }) => approval.userId === id && approval.status === "APPROVED")
    );

    if (allApproved) {
      const trustUnitId = randomUUID();
      await prisma.$executeRaw`
        INSERT INTO "trust_units" (id, status, "createdAt")
        VALUES (${trustUnitId}, 'ACTIVE'::"TrustUnitStatus", NOW())
      `;
      for (const id of memberIds) {
        await prisma.$executeRaw`
          INSERT INTO "trust_unit_members" (id, "trustUnitId", "userId", "createdAt")
          VALUES (${randomUUID()}, ${trustUnitId}, ${id}, NOW())
          ON CONFLICT ("trustUnitId", "userId") DO NOTHING
        `;
      }
      await prisma.$executeRaw`
        UPDATE "trust_unit_requests"
        SET status = 'ACTIVE'::"TrustUnitRequestStatus"
        WHERE id = ${requestId}
      `;
    }

    return NextResponse.json({ ok: true, active: allApproved });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("[trust/respond]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  });
}
