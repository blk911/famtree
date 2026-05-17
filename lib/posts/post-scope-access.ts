import type { DashboardPostScope } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { dashboardFeedWhere } from "@/lib/posts/dashboard-feed-where";

export async function viewerCanAccessPost(viewerId: string, postId: string): Promise<boolean> {
  const n = await prisma.post.count({
    where: {
      AND: [{ id: postId }, dashboardFeedWhere(viewerId)],
    },
  });
  return n > 0;
}

/** Validates creating a post with the given scope (403 → NOT_ALLOWED_FOR_SCOPE when false). */
export async function userMayPostWithScope(params: {
  userId: string;
  scope: DashboardPostScope;
  spaceId?: string | null;
}): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { status: true },
  });
  if (!user || user.status !== "active") return false;

  switch (params.scope) {
    case "FAMILY":
    case "PRIVATE":
      return !params.spaceId;
    case "BUSINESS":
    case "CLUB":
    case "CHURCH": {
      if (!params.spaceId) return false;
      const membership = await prisma.dashboardSpaceMember.findFirst({
        where: {
          userId: params.userId,
          spaceId: params.spaceId,
          space: { kind: params.scope },
        },
      });
      return !!membership;
    }
    default:
      return false;
  }
}
