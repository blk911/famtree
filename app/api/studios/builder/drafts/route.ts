import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withApiTrace } from "@/lib/trace";
import { createStudioBuilderDraft, listStudioBuilderDraftsForOwner } from "@/lib/studios/builder";
import { studioBuilderErrorResponse } from "@/lib/studios/builder/apiResponse";
import { createDraftBodySchema } from "@/lib/studios/builder/schemas";
import { ZodError } from "zod";

export async function GET(req: NextRequest) {
  return withApiTrace(req, "/api/studios/builder/drafts", async () => {
    try {
      const user = await requireAuth();
      const drafts = await listStudioBuilderDraftsForOwner(user.id);
      return NextResponse.json({ drafts });
    } catch (err) {
      return studioBuilderErrorResponse(err);
    }
  });
}

export async function POST(req: NextRequest) {
  return withApiTrace(req, "/api/studios/builder/drafts", async (req) => {
    try {
      const user = await requireAuth();
      const body = createDraftBodySchema.parse(await req.json());
      const stewardName = `${user.firstName} ${user.lastName}`.trim();
      const draft = await createStudioBuilderDraft(user.id, body, stewardName);
      return NextResponse.json({ draft }, { status: 201 });
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
      }
      return studioBuilderErrorResponse(err);
    }
  });
}
