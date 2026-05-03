// GET — list all members in the family network

import { withApiTrace } from "@/lib/trace";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getTrustUnits } from "@/lib/trust";

export async function GET(req: NextRequest) {
  return withApiTrace(req, "/api/members", async (req: NextRequest) => {

  try {
    const user = await requireAuth();
    const [members, trustUnits] = await Promise.all([
      prisma.user.findMany({
        orderBy: { firstName: "asc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          photoUrl: true,
          role: true,
          createdAt: true,
          profile: {
            select: { bio: true, familyRole: true, location: true, coverUrl: true },
          },
        },
      }),
      getTrustUnits(user.id),
    ]);

    return NextResponse.json({ members, trustUnits });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  });
}
