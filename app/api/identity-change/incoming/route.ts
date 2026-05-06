// GET /api/identity-change/incoming — acknowledgments awaiting current user

import { withApiTrace } from "@/lib/trace";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { isIdentityChangeSchemaMissing } from "@/lib/identity-change/errors";
import { IC_STATUS, refreshAckPhase } from "@/lib/identity-change/service";

export async function GET(req: NextRequest) {
  return withApiTrace(req, "/api/identity-change/incoming", async (req: NextRequest) => {

  try {
    const user = await requireAuth();

    try {
      const pending = await prisma.identityChangeAcknowledgment.findMany({
        where: {
          inviteeId: user.id,
          response: null,
          request: { status: IC_STATUS.PENDING_ACKS },
        },
        include: {
          request: {
            include: {
              requester: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
        },
        orderBy: { id: "desc" },
      });

      const ids = Array.from(new Set(pending.map((p) => p.requestId)));
      await Promise.all(ids.map((id) => refreshAckPhase(id)));

      const stillPending = await prisma.identityChangeAcknowledgment.findMany({
        where: {
          inviteeId: user.id,
          response: null,
          request: { status: IC_STATUS.PENDING_ACKS },
        },
        include: {
          request: {
            include: {
              requester: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
        },
        orderBy: { id: "desc" },
      });

      return NextResponse.json({
        items: stillPending.map((row) => ({
          acknowledgmentId: row.id,
          requestId: row.requestId,
          expiresAt: row.request.expiresAt,
          requesterNote: row.request.requesterNote,
          proposed: {
            changeName: row.request.changeName,
            changeEmail: row.request.changeEmail,
            changePhone: row.request.changePhone,
            firstName: row.request.proposedFirstName,
            lastName: row.request.proposedLastName,
            email: row.request.proposedEmail,
            phone: row.request.proposedPhone,
          },
          previous: {
            firstName: row.request.prevFirstName,
            lastName: row.request.prevLastName,
            email: row.request.prevEmail,
            phone: row.request.prevPhone,
          },
          requester: row.request.requester,
        })),
      });
    } catch (inner: unknown) {
      if (!isIdentityChangeSchemaMissing(inner)) throw inner;
      console.warn("[identity-change/incoming GET] identity tables missing — empty items", inner);
      return NextResponse.json({ items: [], identityUnavailable: true });
    }
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("[identity-change/incoming]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  });
}
