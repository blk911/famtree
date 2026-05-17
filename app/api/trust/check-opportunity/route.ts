// POST /api/trust/check-opportunity — detect shared connectors for a possible Trust Unit

import { withApiTraceLite } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { findTrustUnitOpportunityConnectors, getTrustMembers } from "@/lib/trust";
import { isHumanTrustEligible } from "@/lib/trust/isHumanTrustEligible";

export async function POST(req: NextRequest) {
  return withApiTraceLite(req, "/api/trust/check-opportunity", async (req: NextRequest) => {

  try {
    const user = await requireAuth();
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid or empty JSON body" }, { status: 400 });
    }
    const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const currentUserId = typeof body.currentUserId === "string" ? body.currentUserId : "";
    const targetUserId = typeof body.targetUserId === "string" ? body.targetUserId : "";

    if (currentUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!targetUserId || targetUserId === user.id) {
      return NextResponse.json({ canFormTrustUnit: false });
    }

    const pair = await prisma.user.findMany({
      where: { id: { in: [currentUserId, targetUserId] } },
      select: { id: true, role: true, email: true },
    });
    if (
      pair.length !== 2 ||
      pair.some((u) => !isHumanTrustEligible({ role: u.role, email: u.email }))
    ) {
      return NextResponse.json({ canFormTrustUnit: false });
    }

    const sharedConnections = await findTrustUnitOpportunityConnectors(currentUserId, targetUserId);
    if (sharedConnections.length === 0) {
      return NextResponse.json({ canFormTrustUnit: false });
    }

    for (const connectorId of sharedConnections) {
      const memberIds = [currentUserId, targetUserId, connectorId];
      const members = await getTrustMembers(memberIds);
      if (members.length === 3) {
        return NextResponse.json({
          canFormTrustUnit: true,
          memberIds,
          members,
        });
      }
    }

    return NextResponse.json({ canFormTrustUnit: false });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  });
}
