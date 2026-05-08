// POST /api/connections/create-request — link two existing members (invite-only graph edge)

import { withApiTrace } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  return withApiTrace(req, "/api/connections/create-request", async (req: NextRequest) => {

  try {
    const user = await requireAuth();
    const { targetUserId } = await req.json();

    if (!targetUserId || targetUserId === user.id) {
      return NextResponse.json({ error: "Invalid connection target" }, { status: 400 });
    }

    /** No separate “accept” UI yet — leaving rows PENDING broke adjacency & Private Feed bonds. */
    const row = await prisma.connectionRequest.upsert({
      where: {
        requesterId_targetId: {
          requesterId: user.id,
          targetId: targetUserId,
        },
      },
      create: {
        requesterId: user.id,
        targetId: targetUserId,
        status: "ACCEPTED",
      },
      update: {
        status: "ACCEPTED",
      },
      select: { id: true },
    });

    return NextResponse.json({ id: row.id });
  } catch (err: unknown) {
    const anyErr = err as { message?: string };
    if (anyErr.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("[connections/create-request]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  });
}
