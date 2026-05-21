import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withApiTrace } from "@/lib/trace";
import { addStudioBuilderSource } from "@/lib/studios/builder";
import { studioBuilderErrorResponse } from "@/lib/studios/builder/apiResponse";
import { addSourceBodySchema } from "@/lib/studios/builder/schemas";
import { ZodError } from "zod";

type RouteContext = { params: Promise<{ draftId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  return withApiTrace(req, "/api/studios/builder/drafts/[draftId]/sources", async (req) => {
    try {
      const user = await requireAuth();
      const { draftId } = await context.params;
      const body = addSourceBodySchema.parse(await req.json());
      const source = await addStudioBuilderSource(draftId, user.id, body);
      return NextResponse.json({ source }, { status: 201 });
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
      }
      return studioBuilderErrorResponse(err);
    }
  });
}
