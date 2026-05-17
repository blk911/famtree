"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPostComposer } from "@/components/dashboard/DashboardPostComposer";
import { PostCard } from "@/components/PostCard";
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

export function DashboardPostsPanel({
  variant,
  currentUserId,
  composerSpaces,
  posts,
  newPostsCount,
  emptyMineHint,
}: {
  variant: "feed" | "mine";
  currentUserId: string;
  composerSpaces: ComposerSpace[];
  posts: SerializedDashboardPost[];
  newPostsCount: number;
  /** When variant=mine and empty, called from primary CTA */
  emptyMineHint?: React.ReactNode;
}) {
  const router = useRouter();
  const [feedComposerOpen, setFeedComposerOpen] = useState(false);

  return (
    <div>
      {variant === "feed" && (
        <>
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
                onClick={() => setFeedComposerOpen(true)}
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

          {feedComposerOpen ? (
            <DashboardPostComposer
              composerSpaces={composerSpaces}
              onRequestClose={() => setFeedComposerOpen(false)}
              onPostedSuccessfully={() => setFeedComposerOpen(false)}
            />
          ) : null}
        </>
      )}

      {variant === "feed" &&
        (newPostsCount > 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 10,
              marginBottom: 14,
              marginTop: 0,
              background: "#fffbeb",
              border: "1px solid #fde68a",
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>🔥</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>
                {newPostsCount} new post{newPostsCount !== 1 ? "s" : ""} from your family
              </div>
              <div style={{ fontSize: 11, color: "#b45309", marginTop: 1 }}>New activity since your last visit</div>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 10,
              marginBottom: 14,
              marginTop: 0,
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>✓</span>
            <div style={{ fontSize: 12, color: "#166534", fontWeight: 500 }}>
              You&apos;re caught up — no new posts since your last visit
            </div>
          </div>
        ))}

      {posts.length === 0 ? (
        <div style={{ padding: variant === "feed" ? "12px 0 8px" : "24px 0", textAlign: variant === "mine" ? "center" : "left" }}>
          <p style={{ fontSize: 13, color: "#78716c", margin: 0 }}>
            {variant === "feed" ? "No posts in your feed yet — say hello below." : "You haven’t posted yet."}
          </p>
          {variant === "mine" && emptyMineHint}
        </div>
      ) : (
        <div className="dashboard-inline-feed space-y-4" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              canDelete={post.profile.user.id === currentUserId}
              onDelete={async (postId) => {
                await fetch(`/api/profile/posts?postId=${postId}`, { method: "DELETE" });
                router.refresh();
              }}
              shareScope={postScopeShareLabel(post.scope ?? "FAMILY")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
