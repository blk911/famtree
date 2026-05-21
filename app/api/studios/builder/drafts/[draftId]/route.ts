import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withApiTrace } from "@/lib/trace";
import {
  getStudioBuilderDraftForOwner,
  patchStudioBuilderDraft,
} from "@/lib/studios/builder";
import { studioBuilderErrorResponse } from "@/lib/studios/builder/apiResponse";
import { patchDraftBodySchema } from "@/lib/studios/builder/schemas";
import { ZodError } from "zod";

type RouteContext = { params: Promise<{ draftId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  return withApiTrace(req, "/api/studios/builder/drafts/[draftId]", async () => {
    try {
      const user = await requireAuth();
      const { draftId } = await context.params;
      const draft = await getStudioBuilderDraftForOwner(draftId, user.id);
      return NextResponse.json({ draft });
    } catch (err) {
      return studioBuilderErrorResponse(err);
    }
  });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  return withApiTrace(req, "/api/studios/builder/drafts/[draftId]", async (req) => {
    try {
      const user = await requireAuth();
      const { draftId } = await context.params;
      const body = patchDraftBodySchema.parse(await req.json());
      const draft = await patchStudioBuilderDraft(draftId, user.id, body);
      return NextResponse.json({ draft });
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
      }
      return studioBuilderErrorResponse(err);
    }
  });
}
