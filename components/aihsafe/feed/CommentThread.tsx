"use client";

import { useState, useCallback } from "react";
import { listComments, createComment } from "@/components/aihsafe/common/apiClient";
import type { ActivityCommentDTO } from "@/types/aihsafe/dto";

function relTime(iso: string) {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60)  return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60)  return `${min}m ago`;
  const hr  = Math.floor(min / 60);
  if (hr  < 24)  return `${hr}h ago`;
  return new Date(iso).toLocaleDateString();
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0] ?? "").join("").toUpperCase().slice(0, 2);
}

interface Props {
  postId:        string;
  initialCount:  number;
  currentUserId: string;
}

export function CommentThread({ postId, initialCount, currentUserId }: Props) {
  const [open,     setOpen]     = useState(false);
  const [comments, setComments] = useState<ActivityCommentDTO[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [draft,    setDraft]    = useState("");
  const [sending,  setSending]  = useState(false);
  const [count,    setCount]    = useState(initialCount);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await listComments(postId);
    if (r.kind === "ok") setComments(r.data.items);
    setLoading(false);
  }, [postId]);

  function toggle() {
    if (!open) load();
    setOpen((v) => !v);
  }

  async function submit() {
    if (!draft.trim()) return;
    setSending(true);
    const r = await createComment(postId, draft.trim());
    if (r.kind === "ok") {
      setComments((prev) => [...prev, r.data]);
      setCount((n) => n + 1);
      setDraft("");
    }
    setSending(false);
  }

  return (
    <div style={{ marginTop: 10 }}>
      {/* Toggle */}
      <button
        type="button"
        onClick={toggle}
        style={{
          background: "none",
          border:     "none",
          padding:    0,
          cursor:     "pointer",
          fontSize:   12,
          color:      "#6b7280",
          display:    "flex",
          alignItems: "center",
          gap:        4,
        }}
        aria-expanded={open}
      >
        <span style={{ fontSize: 14 }}>💬</span>
        {count > 0 ? `${count} comment${count !== 1 ? "s" : ""}` : "Add a comment"}
      </button>

      {open && (
        <div style={{ marginTop: 10 }}>
          {/* Existing comments */}
          {loading && (
            <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 8px" }}>Loading…</p>
          )}
          {comments.map((c) => (
            <div
              key={c.id}
              style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}
            >
              <div
                style={{
                  width:          28,
                  height:         28,
                  borderRadius:   "50%",
                  background:     "#e5e7eb",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  fontSize:       10,
                  fontWeight:     700,
                  color:          "#374151",
                  flexShrink:     0,
                  overflow:       "hidden",
                }}
              >
                {c.authorPhotoUrl ? (
                  <img src={c.authorPhotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  initials(c.authorName)
                )}
              </div>
              <div style={{ flex: 1, background: "#f9fafb", borderRadius: 10, padding: "6px 10px" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "baseline", marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>{c.authorName}</span>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>{relTime(c.createdAt)}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.45 }}>{c.body}</p>
              </div>
            </div>
          ))}

          {/* Composer */}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a comment…"
              rows={2}
              disabled={sending}
              aria-label="Write a comment"
              style={{
                flex:        1,
                borderRadius: 10,
                border:      "1px solid #e5e7eb",
                padding:     "7px 10px",
                fontSize:    13,
                resize:      "none",
                outline:     "none",
                fontFamily:  "inherit",
                color:       "#111827",
                background:  "#fff",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
              }}
            />
            <button
              type="button"
              onClick={submit}
              disabled={sending || !draft.trim()}
              style={{
                alignSelf:    "flex-end",
                background:   "#7c3aed",
                color:        "#fff",
                border:       "none",
                borderRadius: 10,
                padding:      "8px 14px",
                fontSize:     12,
                fontWeight:   600,
                cursor:       "pointer",
                opacity:      sending || !draft.trim() ? 0.5 : 1,
              }}
              aria-label="Submit comment"
            >
              {sending ? "…" : "Post"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
