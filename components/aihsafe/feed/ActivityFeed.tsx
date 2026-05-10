"use client";

import { useState, useEffect, useCallback } from "react";
import { listActivityFeed } from "@/components/aihsafe/common/apiClient";
import { PostComposer }     from "@/components/aihsafe/feed/PostComposer";
import { ActivityCard }     from "@/components/aihsafe/feed/ActivityCard";
import type { ActivityPostDTO, TrustUnitDTO } from "@/types/aihsafe/dto";

interface Props {
  currentUserId: string;
  trustUnits:    TrustUnitDTO[];
}

export function ActivityFeed({ currentUserId, trustUnits }: Props) {
  const [posts,   setPosts]   = useState<ActivityPostDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor,  setCursor]  = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (replace = true) => {
    setLoading(true);
    const r = await listActivityFeed(replace ? undefined : (cursor ?? undefined));
    if (r.kind === "ok") {
      setPosts((prev) => replace ? r.data.items : [...prev, ...r.data.items]);
      setCursor(r.data.pagination.cursor ?? null);
      setHasMore(r.data.pagination.hasMore);
    }
    setLoading(false);
  }, [cursor]);

  useEffect(() => { load(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section aria-label="Family activity feed">
      {/* Composer */}
      <PostComposer
        trustUnits={trustUnits}
        currentUserId={currentUserId}
        onPosted={() => load(true)}
      />

      {/* Feed */}
      {loading && posts.length === 0 && (
        <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "32px 0" }}>
          Loading activity…
        </p>
      )}

      {!loading && posts.length === 0 && (
        <div
          style={{
            textAlign:    "center",
            padding:      "40px 24px",
            background:   "#fff",
            borderRadius: 16,
            border:       "1px solid #e7e5e4",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 10 }}>🌱</div>
          <p style={{ fontWeight: 700, fontSize: 15, color: "#1c1917", margin: "0 0 6px" }}>
            Your family network is just getting started
          </p>
          <p style={{ fontSize: 13, color: "#78716c", margin: 0 }}>
            Post something above — only the people in your trusted spaces will see it.
          </p>
        </div>
      )}

      {posts.map((post) => (
        <ActivityCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
        />
      ))}

      {hasMore && (
        <button
          type="button"
          onClick={() => load(false)}
          disabled={loading}
          style={{
            display:      "block",
            width:        "100%",
            padding:      "10px",
            background:   "#f9fafb",
            border:       "1px solid #e5e7eb",
            borderRadius: 12,
            fontSize:     13,
            color:        "#374151",
            cursor:       "pointer",
            marginTop:    4,
          }}
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </section>
  );
}
