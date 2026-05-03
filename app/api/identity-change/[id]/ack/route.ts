// POST /api/identity-change/[id]/ack — invitee yes/no

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { IC_STATUS, refreshAckPhase } from "@/lib/identity-change/service";

const bodySchema = z.object({ accept: z.boolean() }).strict();

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const requestId = params.id;

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Expected { accept: boolean }" }, { status: 400 });
    }
    const { accept } = parsed.data;

    const icr = await prisma.identityChangeRequest.findFirst({
      where: { id: requestId, status: IC_STATUS.PENDING_ACKS },
    });
    if (!icr) {
      return NextResponse.json({ error: "Request not open for acknowledgment" }, { status: 404 });
    }

    const ack = await prisma.identityChangeAcknowledgment.findFirst({
      where: { requestId, inviteeId: user.id },
    });
    if (!ack) {
      return NextResponse.json({ error: "You are not an invitee on this request" }, { status: 403 });
    }
    if (ack.response != null) {
      return NextResponse.json({ error: "Already responded" }, { status: 409 });
    }

    await prisma.identityChangeAcknowledgment.update({
      where: { id: ack.id },
      data: {
        response: accept ? "YES" : "NO",
        respondedAt: new Date(),
      },
    });

    await refreshAckPhase(requestId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("[identity-change ack]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
