"use client";

import { useCallback, useEffect, useState } from "react";
import { Video, ChevronDown, ChevronUp } from "lucide-react";

type VideoMessage = {
  id: string;
  slug: string;
  title: string;
  caption: string;
  videoUrl: string | null;
  notes: string | null;
  isEnabled: boolean;
  watchOnce: boolean;
  createdAt: string;
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid #d6d3d1",
  fontSize: 13,
  background: "#fafaf9",
  boxSizing: "border-box",
};

export function MemberVideoMessageRepository() {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<VideoMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("Watch Once");
  const [videoUrl, setVideoUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/member-video-messages", { credentials: "include" });
      const data = await r.json();
      if (r.ok) setItems(data.items ?? []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (expanded) void load();
  }, [expanded, load]);

  const handleCreate = async () => {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/member-video-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: title.trim(),
        caption: caption.trim() || "Watch Once",
        videoUrl: videoUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setTitle("");
      setVideoUrl("");
      setNotes("");
      setCaption("Watch Once");
      await load();
    } else {
      setError(data.error ?? "Could not save.");
    }
  };

  const toggleEnabled = async (item: VideoMessage) => {
    await fetch(`/api/admin/member-video-messages/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isEnabled: !item.isEnabled }),
    });
    await load();
  };

  const enabled = items.find((i) => i.isEnabled);

  return (
    <div
      style={{
        background: "white",
        borderRadius: "16px",
        border: "1px solid #ece9e3",
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        style={{
          width: "100%",
          padding: "14px 20px",
          border: "none",
          borderBottom: expanded ? "1px solid #f5f4f0" : "none",
          background: "linear-gradient(90deg, #f5f3ff, #fff)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Video style={{ width: 15, height: 15, color: "#7c3aed", flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: 13, color: "#5b21b6" }}>
            Member video messages
          </span>
          <span style={{ fontSize: 10, color: "#78716c" }}>repository · dashboard slot</span>
          {enabled ? (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 999,
                background: "#dcfce7",
                color: "#166534",
              }}
            >
              ON: {enabled.title}
            </span>
          ) : (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 999,
                background: "#f5f5f4",
                color: "#78716c",
              }}
            >
              OFF
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp style={{ width: 16, height: 16, color: "#78716c" }} />
        ) : (
          <ChevronDown style={{ width: 16, height: 16, color: "#78716c" }} />
        )}
      </button>

      {expanded && (
        <div style={{ padding: "18px 20px 22px" }}>
          <p style={{ fontSize: 12, color: "#57534e", margin: "0 0 14px", lineHeight: 1.5 }}>
            Store HeyGen / MP4 intro versions here. Members only see an enabled row with a video URL when{" "}
            <code style={{ fontSize: 11 }}>MEMBER_VIDEO_GATE_ENABLED=true</code> on the server. Swap messages
            offline, then enable the new row (disables siblings for the same slot).
          </p>

          <div
            style={{
              display: "grid",
              gap: 10,
              marginBottom: 16,
              padding: 14,
              background: "#fafaf9",
              borderRadius: 12,
              border: "1px dashed #d6d3d1",
            }}
          >
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#44403c" }}>Title</label>
              <input
                style={{ ...inputStyle, marginTop: 4 }}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Welcome to your dashboard"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#44403c" }}>Caption badge</label>
              <input
                style={{ ...inputStyle, marginTop: 4 }}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Watch Once"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#44403c" }}>Video URL (MP4)</label>
              <input
                style={{ ...inputStyle, marginTop: 4 }}
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://… (leave empty for placeholder)"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#44403c" }}>Admin notes</label>
              <textarea
                style={{ ...inputStyle, marginTop: 4, minHeight: 56, resize: "vertical" }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="HeyGen export Mar 2026, 4:12 runtime…"
              />
            </div>
            {error && <p style={{ fontSize: 12, color: "#dc2626", margin: 0 }}>{error}</p>}
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={saving}
              style={{
                justifySelf: "start",
                padding: "9px 18px",
                borderRadius: 10,
                border: "none",
                background: "#7c3aed",
                color: "#fff",
                fontWeight: 600,
                fontSize: 13,
                cursor: saving ? "wait" : "pointer",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Saving…" : "Add to repository"}
            </button>
          </div>

          <p style={{ fontSize: 11, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 8px" }}>
            Saved versions {loading ? "…" : `(${items.length})`}
          </p>

          {items.length === 0 && !loading && (
            <p style={{ fontSize: 13, color: "#a8a29e", margin: 0 }}>No messages yet — add a placeholder row.</p>
          )}

          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {items.map((item) => (
              <li
                key={item.id}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid #e7e5e4",
                  marginBottom: 8,
                  background: item.isEnabled ? "#f5f3ff" : "#fff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#1c1917" }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: "#78716c", marginTop: 2 }}>
                      {item.caption} · {item.slug}
                      {item.videoUrl ? " · has URL" : " · no URL (placeholder)"}
                    </div>
                    {item.notes && (
                      <div style={{ fontSize: 11, color: "#a8a29e", marginTop: 4 }}>{item.notes}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleEnabled(item)}
                    style={{
                      flexShrink: 0,
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: `1px solid ${item.isEnabled ? "#86efac" : "#e7e5e4"}`,
                      background: item.isEnabled ? "#dcfce7" : "#fafaf9",
                      color: item.isEnabled ? "#166534" : "#57534e",
                      fontWeight: 700,
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    {item.isEnabled ? "Enabled" : "Enable"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
