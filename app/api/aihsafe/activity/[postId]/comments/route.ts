// AIH Safe — Activity Comments
// GET  /api/aihsafe/activity/[postId]/comments — list comments for a post
// POST /api/aihsafe/activity/[postId]/comments — add a comment

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";
import { buildActorContext, canComment } from "@/lib/aihsafe";
import { asAIHUserId } from "@/types/aihsafe/ids";
import {
  created,
  ok,
  notFound,
  unauthenticated,
  governanceDenied,
  rateLimited,
  validationFail,
  serverError,
} from "@/lib/aihsafe/api/envelopes";
import { checkCommentLimits } from "@/lib/aihsafe/limits";
import { readJson } from "@/lib/aihsafe/api/parse";
import type { ActivityCommentDTO } from "@/types/aihsafe/dto";

const CreateCommentSchema = z.object({
  body: z.string().min(1).max(1000),
});

function mapComment(c: {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: Date;
  author: { firstName: string; lastName: string; photoUrl: string | null };
}): ActivityCommentDTO {
  return {
    id:             c.id,
    postId:         c.postId,
    authorId:       c.authorId,
    authorName:     `${c.author.firstName} ${c.author.lastName}`.trim(),
    authorPhotoUrl: c.author.photoUrl,
    body:           c.body,
    createdAt:      c.createdAt.toISOString(),
  };
}

const COMMENT_SELECT = {
  id: true, postId: true, authorId: true, body: true, createdAt: true,
  author: { select: { firstName: true, lastName: true, photoUrl: true } },
} as const;

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const user = await requireAuth();
    if (!user) return unauthenticated();

    const post = await prisma.aihActivityPost.findUnique({
      where: { id: params.postId },
      select: { id: true, visibilityScope: true, trustUnitId: true },
    });
    if (!post) return notFound("post");

    const comments = await prisma.aihActivityComment.findMany({
      where: { postId: params.postId },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: COMMENT_SELECT,
    });

    return ok({ items: comments.map(mapComment), pagination: { cursor: null, hasMore: false, total: comments.length } });
  } catch (err) {
    console.error("[aihsafe/activity/comments GET]", err);
    return serverError();
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const user = await requireAuth();
    if (!user) return unauthenticated();

    const post = await prisma.aihActivityPost.findUnique({
      where: { id: params.postId },
      select: { id: true, visibilityScope: true, trustUnitId: true, governanceState: true },
    });
    if (!post || post.governanceState !== "allowed") return notFound("post");

    const body = await readJson(req);
    const parsed = CreateCommentSchema.safeParse(body);
    if (!parsed.success) return validationFail("Invalid request body");

    const limitCheck = await checkCommentLimits(user.id);
    if (!limitCheck.allowed) return rateLimited(limitCheck.message);

    const actor = await buildActorContext(asAIHUserId(user.id));
    const decision = canComment(actor, {
      visibilityScope: post.visibilityScope as any,
      trustUnitId:     post.trustUnitId as any,
    });
    if (!decision.allowed) return governanceDenied(decision);

    const comment = await prisma.aihActivityComment.create({
      data: {
        postId:   params.postId,
        authorId: user.id,
        body:     parsed.data.body,
      },
      select: COMMENT_SELECT,
    });

    return created(mapComment(comment));
  } catch (err) {
    console.error("[aihsafe/activity/comments POST]", err);
    return serverError();
  }
}
