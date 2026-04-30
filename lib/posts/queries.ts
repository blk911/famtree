import { prisma } from "@/lib/db/prisma";
import { dedupePosts } from "@/lib/posts/utils";

const postInclude = {
  _count: { select: { likes: true, comments: true } },
  visibility: { select: { userId: true } },
  profile: {
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, photoUrl: true },
      },
    },
  },
} as const;

export type FeedPost = Awaited<ReturnType<typeof getFeedPosts>>[number];

export async function getFeedPosts(viewerId: string) {
  const [everyonePosts, myPosts, linkedPosts] = await Promise.all([
    prisma.post.findMany({
      where: { visibility: { none: {} } },
      include: postInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.post.findMany({
      where: { profile: { userId: viewerId } },
      include: postInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.post.findMany({
      where: { visibility: { some: { userId: viewerId } } },
      include: postInclude,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return dedupePosts([
    ...everyonePosts,
    ...myPosts,
    ...linkedPosts,
  ]);
}

export async function getProfilePosts(profileUserId: string) {
  return prisma.post.findMany({
    where: { profile: { userId: profileUserId } },
    include: postInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getPrivateFeedPosts(viewerId: string) {
  return prisma.post.findMany({
    where: { visibility: { some: { userId: viewerId } } },
    include: postInclude,
    orderBy: { createdAt: "desc" },
  });
}
