"use client";

import { useState, useEffect, useCallback } from "react";
import { listActivityFeed } from "@/components/aihsafe/common/apiClient";
import { PostComposer }     from "@/components/aihsafe/feed/PostComposer";
import { ActivityCard }     from "@/components/aihsafe/feed/ActivityCard";
import type { ActivityPostDTO, TrustUnitDTO } from "@/types/aihsafe/dto";
import { vaultSpaceTypeShortLabel } from "@/lib/aihsafe/vault-space";

interface Props {
  currentUserId: string;
  trustUnits:    TrustUnitDTO[];
  viewerMode?:   "founder" | "member" | "child";
  /** When set, GET /activity includes trustUnitId filter. */
  scopedTrustUnitId?: string | null;
  onScopedTrustUnitChange?: (id: string | null) => void;
}

const SAMPLE_PROMPTS = [
  { icon: "📸", text: "Share a family moment from this week" },
  { icon: "📖", text: "What's everyone reading or watching?" },
  { icon: "🗓️", text: "Upcoming events or plans to share" },
  { icon: "🙏", text: "A thank-you or kind word for someone" },
];

export function ActivityFeed({
  currentUserId,
  trustUnits,
  viewerMode = "founder",
  scopedTrustUnitId = null,
  onScopedTrustUnitChange,
}: Props) {
  const [posts,      setPosts]      = useState<ActivityPostDTO[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [cursor,     setCursor]     = useState<string | null>(null);
  const [hasMore,    setHasMore]    = useState(false);

  const load = useCallback(async (replace = true) => {
    setLoading(true);
    setFetchError(null);
    try {
      const r = await listActivityFeed(replace ? undefined : (cursor ?? undefined), {
        trustUnitId: scopedTrustUnitId ?? undefined,
      });
      if (r.kind === "ok") {
        setPosts((prev) => (replace ? r.data.items : [...prev, ...r.data.items]));
        setCursor(r.data.pagination.cursor ?? null);
        setHasMore(r.data.pagination.hasMore);
      } else {
        setFetchError("Couldn't load posts. Try again.");
      }
    } catch {
      setFetchError("Couldn't reach the server. Check your connection and try again.");
    }
    setLoading(false);
  }, [cursor, scopedTrustUnitId]);

  useEffect(() => {
    setCursor(null);
    setPosts([]);
    setHasMore(false);
    let cancelled = false;
    (async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const r = await listActivityFeed(undefined, {
          trustUnitId: scopedTrustUnitId ?? undefined,
        });
        if (cancelled) return;
        if (r.kind === "ok") {
          setPosts(r.data.items);
          setCursor(r.data.pagination.cursor ?? null);
          setHasMore(r.data.pagination.hasMore);
        } else {
          setFetchError("Couldn't load posts. Try again.");
        }
      } catch {
        if (!cancelled) setFetchError("Couldn't reach the server. Check your connection and try again.");
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [scopedTrustUnitId]);

  return (
    <section aria-label="Family activity feed">
      {/* Fetch error */}
      {fetchError && !loading && (
        <div
          role="alert"
          style={{
            background:   "#fef2f2",
            border:       "1px solid #fca5a5",
            borderRadius: 14,
            padding:      "14px 18px",
            marginBottom: 12,
            display:      "flex",
            alignItems:   "center",
            gap:          12,
          }}
        >
          <span style={{ fontSize: 18, flexShrink: 0 }}>⚠</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#dc2626" }}>Couldn&apos;t load posts</div>
            <div style={{ fontSize: 12, color: "#78716c", marginTop: 2 }}>{fetchError}</div>
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            style={{
              padding:      "7px 14px",
              borderRadius: 9,
              border:       "1px solid #fca5a5",
              background:   "#fff",
              color:        "#dc2626",
              fontWeight:   600,
              fontSize:     12,
              cursor:       "pointer",
              flexShrink:   0,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {trustUnits.length > 0 && onScopedTrustUnitChange && (
        <div
          style={{
            marginBottom: 12,
            padding:      "10px 14px",
            background:   "#fff",
            borderRadius: 12,
            border:       "1px solid #e7e5e4",
            display:      "flex",
            flexWrap:     "wrap",
            alignItems:   "center",
            gap:          10,
          }}
        >
          <label htmlFor="vault-activity-scope" style={{ fontSize: 12, fontWeight: 600, color: "#57534e" }}>
            Show activity for
          </label>
          <select
            id="vault-activity-scope"
            value={scopedTrustUnitId ?? ""}
            onChange={(e) => onScopedTrustUnitChange(e.target.value || null)}
            style={{
              flex:         "1 1 180px",
              minWidth:     160,
              padding:      "7px 10px",
              borderRadius: 9,
              border:       "1px solid #d6d3d1",
              fontSize:     13,
              background:   "#fafaf9",
              color:        "#1c1917",
            }}
          >
            <option value="">All trusted spaces</option>
            {trustUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name?.trim()
                  ? u.name
                  : `${vaultSpaceTypeShortLabel(u.vaultSpaceType)} space`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Composer */}
      <PostComposer
        trustUnits={trustUnits}
        currentUserId={currentUserId}
        onPosted={() => load(true)}
        viewerMode={viewerMode}
        composerPresetTrustUnitId={scopedTrustUnitId}
      />

      {/* Loading skeleton */}
      {loading && posts.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2].map((i) => (
            <div
              key={i}
              style={{
                background:   "#fff",
                borderRadius: 16,
                border:       "1px solid #e7e5e4",
                padding:      "16px 18px",
                boxShadow:    "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#f3f4f6" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 13, width: "40%", background: "#f3f4f6", borderRadius: 6, marginBottom: 6 }} />
                  <div style={{ height: 11, width: "20%", background: "#f9fafb", borderRadius: 6 }} />
                </div>
              </div>
              <div style={{ height: 13, background: "#f3f4f6", borderRadius: 6, marginBottom: 6 }} />
              <div style={{ height: 13, width: "75%", background: "#f9fafb", borderRadius: 6 }} />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && posts.length === 0 && (
        <div
          style={{
            background:   "#fff",
            borderRadius: 16,
            border:       "1px solid #e7e5e4",
            padding:      "32px 24px",
            boxShadow:    "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🌱</div>
            <p style={{ fontWeight: 700, fontSize: 15, color: "#1c1917", margin: "0 0 6px" }}>
              Your family network is just getting started
            </p>
            <p style={{ fontSize: 13, color: "#78716c", margin: 0, maxWidth: 320, marginInline: "auto" }}>
              Posts you share land here — visible only to the people in your trusted spaces.
            </p>
          </div>

          {/* Sample prompts */}
          {trustUnits.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 10px", textAlign: "center" }}>
                Ideas to get started
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {SAMPLE_PROMPTS.map((p) => (
                  <div
                    key={p.text}
                    style={{
                      background:   "#fafaf9",
                      border:       "1px solid #e7e5e4",
                      borderRadius: 12,
                      padding:      "10px 12px",
                      fontSize:     12,
                      color:        "#57534e",
                      lineHeight:   1.4,
                    }}
                  >
                    <span style={{ marginRight: 6 }}>{p.icon}</span>
                    {p.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Posts */}
      {posts.map((post) => (
        <ActivityCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
        />
      ))}

      {/* Load more */}
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
            cursor:       loading ? "not-allowed" : "pointer",
            marginTop:    4,
            fontWeight:   500,
          }}
        >
          {loading ? "Loading…" : "Load older posts"}
        </button>
      )}
    </section>
  );
}
