// POST /api/trust/create-request — create a pending Trust Unit request and auto-approve creator

import { withApiTrace } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { createTrustUnitProposal } from "@/lib/trust/tuProposal";
import { isTrustUnitEligibleUser } from "@/lib/trust/isTrustUnitEligibleUser";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  return withApiTrace(req, "/api/trust/create-request", async (req: NextRequest) => {

  try {
    const user = await requireAuth();
    const body = await req.json();
    const { memberIds, pendingInviteIds: rawPending, createdBy } = body;
    const uniqueMemberIds = Array.isArray(memberIds) ? Array.from(new Set(memberIds)) : [];
    const pendingInviteIds = Array.isArray(rawPending) ? Array.from(new Set(rawPending)) : [];

    if (createdBy !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const totalSlots = uniqueMemberIds.length + pendingInviteIds.length;
    if (totalSlots < 3 || totalSlots > 20 || !uniqueMemberIds.includes(user.id)) {
      return NextResponse.json({ error: "Trust Units require 3–20 members including you" }, { status: 400 });
    }

    const registeredRoles = await prisma.user.findMany({
      where: { id: { in: uniqueMemberIds } },
      select: { id: true, role: true },
    });
    if (
      registeredRoles.length !== uniqueMemberIds.length ||
      registeredRoles.some((u) => !isTrustUnitEligibleUser({ role: u.role }))
    ) {
      return NextResponse.json(
        { error: "Trust Units cannot include system accounts" },
        { status: 400 },
      );
    }

    if (pendingInviteIds.length > 0) {
      const invites = await prisma.invite.findMany({
        where: {
          id: { in: pendingInviteIds },
          senderId: user.id,
          status: { in: ["PENDING", "ACCEPTED"] },
        },
      });
      if (invites.length !== pendingInviteIds.length) {
        return NextResponse.json(
          { error: "Each pending invite must be yours and not yet registered" },
          { status: 400 },
        );
      }
      const alreadySlotted = await prisma.trustUnitRequestPendingInvite.findMany({
        where: { inviteId: { in: pendingInviteIds } },
      });
      if (alreadySlotted.length > 0) {
        return NextResponse.json(
          { error: "One or more invites are already attached to a Trust Unit proposal" },
          { status: 409 },
        );
      }
    }

    let requestId: string;
    try {
      requestId = await createTrustUnitProposal({
        createdById: user.id,
        registeredMemberIds: uniqueMemberIds,
        pendingInviteIds,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid Trust Unit proposal";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ id: requestId });
  } catch (err: unknown) {
    const anyErr = err as { message?: string };
    if (anyErr.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Invite already used in another proposal" }, { status: 409 });
    }
    console.error("[trust/create-request]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  });
}
