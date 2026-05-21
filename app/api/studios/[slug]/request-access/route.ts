import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";
import { withApiTrace } from "@/lib/trace";
import { GAP_U_SLUG } from "@/lib/studios/gapu";

const bodySchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  note: z.string().max(2000).optional(),
  relationship: z.string().max(80).optional(),
});

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  return withApiTrace(req, "/api/studios/[slug]/request-access", async (req) => {
    try {
      const { slug } = await context.params;
      const body = bodySchema.parse(await req.json());
      const studio = await prisma.studio.findUnique({
        where: { slug },
        select: { id: true, ownerId: true, publishedFromDraft: { select: { templateType: true } } },
      });
      if (!studio) {
        if (slug === GAP_U_SLUG) {
          return NextResponse.json({
            ok: true,
            message:
              "Request received for Gap U. A steward will review your note — guardian rules apply for students. (Flagship preview: persist studio row to store in database.)",
          });
        }
        return NextResponse.json({ error: "Studio not found" }, { status: 404 });
      }

      const viewer = await getCurrentUser();
      if (viewer?.id === studio.ownerId) {
        return NextResponse.json({ error: "You already own this studio." }, { status: 400 });
      }

      const templateType = studio.publishedFromDraft?.templateType ?? "";
      const isLearning =
        templateType === "family-learning" || templateType === "gap-u-learning-lab";

      await prisma.studioAccessRequest.create({
        data: {
          studioId: studio.id,
          requesterName: body.name.trim(),
          requesterEmail: body.email.trim().toLowerCase(),
          note: body.note?.trim() || null,
          relationship: body.relationship?.trim() || null,
          status: "pending",
        },
      });

      return NextResponse.json({
        ok: true,
        message: isLearning
          ? "Request received. A parent or steward will review — child access follows guardian rules."
          : "Request received. The studio steward will review your request.",
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
      }
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}
