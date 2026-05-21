"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPostComposer } from "@/components/dashboard/DashboardPostComposer";
import { PostCard } from "@/components/PostCard";
import { deletePostClient } from "@/lib/feed/delete-post-client";
import { postScopeShareLabel } from "@/lib/posts/scope-labels";

export type SerializedDashboardPost = {
  id: string;
  title?: string | null;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  scope?: string | null;
  _count?: { likes: number; comments: number; thumbsUp?: number; thumbsDown?: number };
  visibility?: Array<{ userId: string }>;
  profile: {
    user: {
      id: string;
      firstName: string;
      lastName: string;
      photoUrl: string | null;
    };
  };
};

type ComposerSpace = { id: string; kind: "BUSINESS" | "CLUB" | "CHURCH"; name: string | null };

function canDeletePost(
  post: SerializedDashboardPost,
  currentUserId: string,
  currentUserRole: string,
): boolean {
  const authorId = post.profile?.user?.id;
  if (!authorId) return false;
  if (authorId === currentUserId) return true;
  return currentUserRole === "founder" || currentUserRole === "admin";
}

export function DashboardPostsPanel({
  variant,
  currentUserId,
  currentUserRole,
  composerSpaces,
  posts,
  newPostsCount,
  emptyMineHint,
}: {
  variant: "feed" | "mine";
  currentUserId: string;
  currentUserRole: string;
  composerSpaces: ComposerSpace[];
  posts: SerializedDashboardPost[];
  newPostsCount: number;
  emptyMineHint?: React.ReactNode;
}) {
  const router = useRouter();
  const [feedComposerOpen, setFeedComposerOpen] = useState(false);
  const [items, setItems] = useState(posts);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setItems(posts);
  }, [posts]);

  const handleDelete = useCallback(
    async (postId: string) => {
      setDeleteErrors((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      setDeletingId(postId);

      const result = await deletePostClient(postId);
      setDeletingId(null);

      if (!result.ok) {
        setDeleteErrors((prev) => ({ ...prev, [postId]: result.error }));
        return;
      }

      setItems((current) => current.filter((p) => p.id !== postId));
      router.refresh();
    },
    [router],
  );

  return (
    <div>
      {variant === "feed" && (
        <>
          <FeedHeader
            feedComposerOpen={feedComposerOpen}
            onOpenComposer={() => setFeedComposerOpen(true)}
          />
          {feedComposerOpen ? (
            <DashboardPostComposer
              composerSpaces={composerSpaces}
              onRequestClose={() => setFeedComposerOpen(false)}
              onPostedSuccessfully={() => setFeedComposerOpen(false)}
            />
          ) : null}
        </>
      )}

      {variant === "feed" && newPostsCount > 0 && <NewPostsBanner count={newPostsCount} />}

      {items.length === 0 ? (
        <EmptyPosts variant={variant} emptyMineHint={emptyMineHint} />
      ) : (
        <div
          className="dashboard-inline-feed space-y-4 [&_img]:max-w-full [&_img]:h-auto [&_video]:max-w-full [&_video]:h-auto"
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          {items.map((post) => (
            <div key={post.id}>
              <PostCard
                post={post}
                currentUserId={currentUserId}
                canDelete={canDeletePost(post, currentUserId, currentUserRole) && deletingId !== post.id}
                onDelete={handleDelete}
                shareScope={postScopeShareLabel(post.scope ?? "FAMILY")}
              />
              {deleteErrors[post.id] && (
                <p
                  role="alert"
                  style={{
                    margin: "6px 0 0",
                    fontSize: 12,
                    color: "#b91c1c",
                    lineHeight: 1.45,
                  }}
                >
                  {deleteErrors[post.id]}
                </p>
              )}
              {deletingId === post.id && (
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "#78716c" }}>Deleting…</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FeedHeader({
  feedComposerOpen,
  onOpenComposer,
}: {
  feedComposerOpen: boolean;
  onOpenComposer: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: "#1c1917",
          letterSpacing: "-0.02em",
        }}
      >
        Posts
      </div>
      {!feedComposerOpen ? (
        <button
          type="button"
          onClick={onOpenComposer}
          style={{
            background: "none",
            border: "none",
            padding: "4px 0",
            fontSize: 13,
            fontWeight: 650,
            color: "#6366f1",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          + Post
        </button>
      ) : null}
    </div>
  );
}

function NewPostsBanner({ count }: { count: number }) {
  return (
    <StatusBanner
      emoji="🔥"
      background="#fffbeb"
      border="#fde68a"
      body={
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>
            {count} new post{count !== 1 ? "s" : ""} from your family
          </div>
          <div style={{ fontSize: 11, color: "#b45309", marginTop: 1 }}>
            New activity since your last visit
          </div>
        </>
      }
    />
  );
}

function StatusBanner({
  emoji,
  background,
  border,
  body,
}: {
  emoji: string;
  background: string;
  border: string;
  body: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 10,
        marginBottom: 14,
        marginTop: 0,
        background,
        border: `1px solid ${border}`,
      }}
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>{emoji}</span>
      <div>{body}</div>
    </div>
  );
}

function EmptyPosts({
  variant,
  emptyMineHint,
}: {
  variant: "feed" | "mine";
  emptyMineHint?: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: variant === "feed" ? "12px 0 8px" : "24px 0",
        textAlign: variant === "mine" ? "center" : "left",
      }}
    >
      {variant === "feed" ? (
        <>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1c1917" }}>
            No new posts yet.
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "#78716c", lineHeight: 1.5 }}>
            Share something with your family or check back soon.
          </p>
        </>
      ) : (
        <p style={{ fontSize: 13, color: "#78716c", margin: 0 }}>You haven&apos;t posted yet.</p>
      )}
      {variant === "mine" && emptyMineHint}
    </div>
  );
}
