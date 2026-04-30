import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPrivateFeedPosts } from "@/lib/posts/queries";
import { getTrustUnits } from "@/lib/trust";
import { PrivateFeedClient } from "@/components/PrivateFeedClient";

function serializePost(post: Awaited<ReturnType<typeof getPrivateFeedPosts>>[number]) {
  return {
    ...post,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    profile: {
      ...post.profile,
      createdAt: post.profile.createdAt.toISOString(),
      updatedAt: post.profile.updatedAt.toISOString(),
      user: post.profile.user,
    },
  };
}

export default async function PrivateFeedPage({
  searchParams,
}: {
  searchParams?: { unit?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [trustUnits, posts] = await Promise.all([
    getTrustUnits(user.id),
    getPrivateFeedPosts(user.id),
  ]);

  return (
    <div className="space-y-6">
      <PrivateFeedClient
        currentUserId={user.id}
        trustUnits={trustUnits}
        posts={posts.map(serializePost)}
        initialUnitId={searchParams?.unit}
      />
    </div>
  );
}
