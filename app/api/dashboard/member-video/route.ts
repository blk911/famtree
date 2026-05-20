import { withApiTrace } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getActiveMemberVideoForUser } from "@/lib/dashboard/memberVideoGate";
import { isMemberVideoGateEnvEnabled } from "@/lib/admin/memberVideoMessages";

export async function GET(req: NextRequest) {
  return withApiTrace(req, "/api/dashboard/member-video", async () => {
    try {
      const user = await requireAuth();
      if (user.role === "founder" || user.role === "admin") {
        return NextResponse.json({ active: null, gateEnabled: isMemberVideoGateEnvEnabled() });
      }

      const active = await getActiveMemberVideoForUser(user.id);
      return NextResponse.json({
        active,
        gateEnabled: isMemberVideoGateEnvEnabled(),
      });
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  });
}
