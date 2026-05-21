import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withApiTrace } from "@/lib/trace";
import { publishStudioBuilderDraft } from "@/lib/studios/builder/publishDraft";
import { studioBuilderErrorResponse } from "@/lib/studios/builder/apiResponse";

type RouteContext = { params: Promise<{ draftId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  return withApiTrace(req, "/api/studios/builder/drafts/[draftId]/publish", async () => {
    try {
      const user = await requireAuth();
      const { draftId } = await context.params;
      const result = await publishStudioBuilderDraft(draftId, user.id);
      return NextResponse.json(result);
    } catch (err) {
      return studioBuilderErrorResponse(err);
    }
  });
}
