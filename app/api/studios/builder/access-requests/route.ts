import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { withApiTrace } from "@/lib/trace";

/** Steward: list pending access requests for studios they own. */
export async function GET(req: NextRequest) {
  return withApiTrace(req, "/api/studios/builder/access-requests", async () => {
    try {
      const user = await requireAuth();
      const requests = await prisma.studioAccessRequest.findMany({
        where: {
          status: "pending",
          studio: { ownerId: user.id },
        },
        orderBy: { createdAt: "desc" },
        include: {
          studio: { select: { slug: true, name: true } },
        },
      });
      return NextResponse.json({ requests });
    } catch (err) {
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}
