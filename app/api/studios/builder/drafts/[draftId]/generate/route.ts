import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withApiTrace } from "@/lib/trace";
import { generateDraftForOwner } from "@/lib/studios/builder/generateDraftForOwner";
import { studioBuilderErrorResponse } from "@/lib/studios/builder/apiResponse";

type RouteContext = { params: Promise<{ draftId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  return withApiTrace(req, "/api/studios/builder/drafts/[draftId]/generate", async () => {
    try {
      const user = await requireAuth();
      const { draftId } = await context.params;
      const stewardName = `${user.firstName} ${user.lastName}`.trim();
      const draft = await generateDraftForOwner(draftId, user.id, stewardName);
      return NextResponse.json({ draft });
    } catch (err) {
      return studioBuilderErrorResponse(err);
    }
  });
}
