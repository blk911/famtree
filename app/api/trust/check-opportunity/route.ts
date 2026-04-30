// POST /api/trust/check-opportunity — detect shared connectors for a possible Trust Unit

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { findSharedConnections, getTrustMembers } from "@/lib/trust";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { currentUserId, targetUserId } = await req.json();

    if (currentUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!targetUserId || targetUserId === user.id) {
      return NextResponse.json({ canFormTrustUnit: false });
    }

    const sharedConnections = await findSharedConnections(currentUserId, targetUserId);
    if (sharedConnections.length === 0) {
      return NextResponse.json({ canFormTrustUnit: false });
    }

    const memberIds = [currentUserId, targetUserId, sharedConnections[0]];
    const members = await getTrustMembers(memberIds);

    return NextResponse.json({
      canFormTrustUnit: true,
      memberIds,
      members,
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
