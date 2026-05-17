// ActivityCard — single governed post card.

import { SpaceBadge }      from "@/components/aihsafe/feed/SpaceBadge";
import { VisibilityReason } from "@/components/aihsafe/feed/VisibilityReason";
import { CommentThread }    from "@/components/aihsafe/feed/CommentThread";
import type { ActivityPostDTO } from "@/types/aihsafe/dto";
import { vaultSharedInLabel } from "@/lib/aihsafe/vault-space";

function relTime(iso: string) {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60)  return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60)  return `${min}m ago`;
  const hr  = Math.floor(min / 60);
  if (hr  < 24)  return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7)   return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

function initials(name: string) {
  const parts = name.trim().split(" ");
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

function governanceBadge(state: string, escalation: string) {
  if (escalation === "pending")  return { label: "⏳ Pending approval", color: "#d97706", bg: "#fffbeb" };
  if (state       === "flagged") return { label: "⚑ Flagged for review", color: "#dc2626", bg: "#fef2f2" };
  return null;
}

interface Props {
  post:          ActivityPostDTO;
  currentUserId: string;
}

export function ActivityCard({ post, currentUserId }: Props) {
  const badge = governanceBadge(post.governanceState, post.escalationState);

  return (
    <article
      style={{
        background:   "#fff",
        borderRadius: 16,
        border:       "1px solid #e7e5e4",
        marginBottom: 12,
        boxShadow:    "0 1px 3px rgba(0,0,0,0.04)",
        overflow:     "hidden",
      }}
      aria-label={`Post by ${post.authorName}`}
    >
      {/* Governance banner (shown above content when needed) */}
      {badge && (
        <div
          style={{
            background:  badge.bg,
            borderBottom: `1px solid ${badge.color}22`,
            padding:     "6px 18px",
            display:     "flex",
            alignItems:  "center",
            gap:         6,
          }}
          role="status"
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: badge.color }}>
            {badge.label}
          </span>
        </div>
      )}

      <div style={{ padding: "14px 18px 0" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
          {/* Avatar */}
          <div
            style={{
              width:          38,
              height:         38,
              borderRadius:   "50%",
              background:     "#e5e7eb",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              fontSize:       13,
              fontWeight:     700,
              color:          "#374151",
              flexShrink:     0,
              overflow:       "hidden",
            }}
            aria-hidden="true"
          >
            {post.authorPhotoUrl ? (
              <img src={post.authorPhotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              initials(post.authorName)
            )}
          </div>

          {/* Name + space + time */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>
                {post.authorName}
              </span>
              {post.trustUnitName && (
                <SpaceBadge name={post.trustUnitName} />
              )}
            </div>
            <time
              dateTime={post.createdAt}
              style={{ fontSize: 11, color: "#9ca3af", display: "block", marginTop: 2 }}
            >
              {relTime(post.createdAt)}
            </time>
            {post.vaultSpaceType && (
              <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 600, marginTop: 4 }}>
                {vaultSharedInLabel(post.vaultSpaceType)}
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <p
          style={{
            margin:     0,
            fontSize:   14,
            color:      "#1c1917",
            lineHeight: 1.65,
            whiteSpace: "pre-wrap",
            wordBreak:  "break-word",
          }}
        >
          {post.bodyText}
        </p>

        {/* Visibility explanation */}
        <VisibilityReason reasons={post.visibilityReasons} />
      </div>

      {/* Separator before comments */}
      <div style={{ height: 1, background: "#f3f4f6", margin: "12px 0 0" }} />

      {/* Comments */}
      <div style={{ padding: "0 18px 14px" }}>
        <CommentThread
          postId={post.id}
          initialCount={post.commentCount}
          currentUserId={currentUserId}
        />
      </div>
    </article>
  );
}
