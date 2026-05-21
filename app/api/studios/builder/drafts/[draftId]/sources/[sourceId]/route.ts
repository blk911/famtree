import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withApiTrace } from "@/lib/trace";
import { removeStudioBuilderSource } from "@/lib/studios/builder";
import { studioBuilderErrorResponse } from "@/lib/studios/builder/apiResponse";

type RouteContext = { params: Promise<{ draftId: string; sourceId: string }> };

export async function DELETE(req: NextRequest, context: RouteContext) {
  return withApiTrace(req, "/api/studios/builder/drafts/[draftId]/sources/[sourceId]", async () => {
    try {
      const user = await requireAuth();
      const { draftId, sourceId } = await context.params;
      await removeStudioBuilderSource(draftId, user.id, sourceId);
      return NextResponse.json({ ok: true });
    } catch (err) {
      return studioBuilderErrorResponse(err);
    }
  });
}
