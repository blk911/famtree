"use client";
// Shows up to 3 recent activity posts in a compact list.
// Self-fetching from the existing listActivityFeed endpoint.
// Hidden entirely if the feed is empty or fails — never shows an error state here.

import { useEffect, useState }    from "react";
import { listActivityFeed }        from "@/components/aihsafe/common/apiClient";
import { CompactActivityItem }     from "@/components/aihsafe/common/CompactActivityItem";
import { SectionHeader }           from "@/components/aihsafe/common/SectionHeader";
import type { ActivityPostDTO }    from "@/types/aihsafe/dto";

function timeAgo(iso: string): string {
  const ms   = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface Props {
  onSeeAll: () => void;
}

export function RecentActivityTeaser({ onSeeAll }: Props) {
  const [posts,  setPosts]  = useState<ActivityPostDTO[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    listActivityFeed()
      .then(r => {
        if (r.kind === "ok") setPosts(r.data.items.slice(0, 3));
        else setFailed(true);
      })
      .catch(() => setFailed(true));
  }, []);

  // Suppress if empty or errored — this is a teaser, not a primary surface
  if (failed) return null;
  if (posts !== null && posts.length === 0) return null;

  return (
    <div
      style={{
        background:   "#fff",
        borderRadius: 16,
        border:       "1px solid #e7e5e4",
        padding:      "18px 20px",
        marginBottom: 14,
      }}
    >
      <SectionHeader
        title="Recent Activity"
        action={
          <button
            type="button"
            onClick={onSeeAll}
            style={{
              background: "none",
              border:     "none",
              fontSize:   12,
              color:      "#78716c",
              cursor:     "pointer",
              fontWeight: 600,
              padding:    0,
            }}
          >
            See all →
          </button>
        }
      />

      {posts === null ? (
        <p style={{ fontSize: 13, color: "#a8a29e", margin: 0 }}>Loading…</p>
      ) : (
        posts.map(post => (
          <CompactActivityItem
            key={post.id}
            icon="💬"
            label={`${post.authorName}: ${
              post.bodyText.length > 72
                ? post.bodyText.slice(0, 72) + "…"
                : post.bodyText
            }`}
            time={timeAgo(post.createdAt)}
          />
        ))
      )}
    </div>
  );
}
