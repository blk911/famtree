import { prisma } from "@/lib/db/prisma";
import { PROFILE_FEED_SELECT } from "@/lib/profile/prisma-select";
import { dedupePosts } from "@/lib/posts/utils";
import { dashboardFeedWhere } from "@/lib/posts/dashboard-feed-where";

const postInclude = {
  _count: { select: { likes: true, comments: true } },
  visibility: { select: { userId: true } },
  profile: {
    select: PROFILE_FEED_SELECT,
  },
} as const;

export type FeedPost = Awaited<ReturnType<typeof getFeedPosts>>[number];

export async function getFeedPosts(viewerId: string) {
  return prisma.post.findMany({
    where: dashboardFeedWhere(viewerId),
    include: postInclude,
    orderBy: { createdAt: "desc" },
  });
}

/** Timeline posts on `profileUserId` that `viewerId` is allowed to see (scoped). */
export async function getProfilePostsForViewer(profileUserId: string, viewerId: string) {
  return prisma.post.findMany({
    where: {
      AND: [{ profile: { userId: profileUserId } }, dashboardFeedWhere(viewerId)],
    },
    include: postInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getPrivateFeedPosts(viewerId: string) {
  const [received, minePrivate, legacyScoped] = await Promise.all([
    prisma.post.findMany({
      where: {
        scope: "PRIVATE",
        visibility: { some: { userId: viewerId } },
      },
      include: postInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.post.findMany({
      where: {
        scope: "PRIVATE",
        profile: { userId: viewerId },
      },
      include: postInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.post.findMany({
      where: {
        scope: "FAMILY",
        visibility: { some: {} },
        OR: [
          { visibility: { some: { userId: viewerId } } },
          { profile: { userId: viewerId } },
        ],
      },
      include: postInclude,
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return dedupePosts([...received, ...minePrivate, ...legacyScoped]);
}
