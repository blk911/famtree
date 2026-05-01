import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getFeedPosts } from "@/lib/posts/queries";
import { FamilyFeedClient } from "@/components/FamilyFeedClient";

function serializePost(post: Awaited<ReturnType<typeof getFeedPosts>>[number]) {
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

export default async function FamilyFeedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const posts = await getFeedPosts(user.id);

  return (
    <div className="content-col space-y-6">
      <FamilyFeedClient currentUserId={user.id} posts={posts.map(serializePost)} />
    </div>
  );
}
