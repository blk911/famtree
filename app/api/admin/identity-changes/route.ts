// GET /api/admin/identity-changes — queue for founder/admin

import { withApiTrace } from "@/lib/trace";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { isIdentityChangeSchemaMissing } from "@/lib/identity-change/errors";
import { IC_STATUS, refreshManyAckPhases } from "@/lib/identity-change/service";

function isAdmin(role: string) {
  return role === "founder" || role === "admin";
}

export async function GET(req: NextRequest) {
  return withApiTrace(req, "/api/admin/identity-changes", async (req: NextRequest) => {

  try {
    const user = await requireAuth();
    if (!isAdmin(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
      const pendingAck = await prisma.identityChangeRequest.findMany({
        where: { status: IC_STATUS.PENDING_ACKS },
        select: { id: true },
      });
      await refreshManyAckPhases(pendingAck.map((r) => r.id));

      const rows = await prisma.identityChangeRequest.findMany({
        where: { status: IC_STATUS.PENDING_ADMIN },
        orderBy: { createdAt: "asc" },
        include: {
          requester: { select: { id: true, firstName: true, lastName: true, email: true } },
          acknowledgments: {
            include: {
              invitee: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
            orderBy: { id: "asc" },
          },
        },
      });

      return NextResponse.json({ requests: rows });
    } catch (inner: unknown) {
      if (!isIdentityChangeSchemaMissing(inner)) throw inner;
      console.warn("[admin identity-changes GET] identity tables/columns missing — empty queue", inner);
      return NextResponse.json({ requests: [], identityUnavailable: true });
    }
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("[admin identity-changes GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  });
}
