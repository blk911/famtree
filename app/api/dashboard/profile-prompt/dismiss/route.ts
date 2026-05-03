import { withApiTrace } from "@/lib/trace";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  return withApiTrace(req, "/api/dashboard/profile-prompt/dismiss", async (req: NextRequest) => {

  try {
    const user = await requireAuth();

    await prisma.$executeRaw`
      UPDATE "profiles"
      SET "dashboardProfilePromptDismissedAt" = now(),
          "updatedAt" = now()
      WHERE "userId" = ${user.id}
    `;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  });
}
