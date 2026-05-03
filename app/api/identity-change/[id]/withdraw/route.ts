// POST /api/identity-change/[id]/withdraw — requester only

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { IC_STATUS } from "@/lib/identity-change/service";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const id = params.id;

    const reqRow = await prisma.identityChangeRequest.findFirst({
      where: { id, requesterId: user.id },
    });
    if (!reqRow) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    if (reqRow.status !== IC_STATUS.PENDING_ACKS && reqRow.status !== IC_STATUS.PENDING_ADMIN) {
      return NextResponse.json({ error: "This request can no longer be withdrawn." }, { status: 400 });
    }

    await prisma.identityChangeRequest.update({
      where: { id },
      data: { status: IC_STATUS.WITHDRAWN, resolvedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("[identity-change withdraw]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
