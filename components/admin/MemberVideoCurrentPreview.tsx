"use client";

import { useCallback, useEffect, useState } from "react";
import { Play, ChevronDown, ChevronUp } from "lucide-react";

const BUNDLED_INTRO_PATH = "/uploads/admin-site-wide-intro.mp4";

type VideoMessage = {
  id: string;
  slug: string;
  title: string;
  caption: string;
  videoUrl: string | null;
  notes: string | null;
  isEnabled: boolean;
};

export function MemberVideoCurrentPreview() {
  const [expanded, setExpanded] = useState(false);
  const [enabled, setEnabled] = useState<VideoMessage | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/member-video-messages", { credentials: "include" });
      const data = await r.json();
      if (r.ok) {
        const items: VideoMessage[] = data.items ?? [];
        setEnabled(items.find((i) => i.isEnabled && i.videoUrl?.trim()) ?? items.find((i) => i.isEnabled) ?? null);
      }
    } catch {
      setEnabled(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const previewSrc =
    enabled?.videoUrl?.trim() ||
    (enabled ? BUNDLED_INTRO_PATH : null);

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
          background: "linear-gradient(90deg, #f0f9ff, #fff)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Play style={{ width: 15, height: 15, color: "#0369a1", flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: 13, color: "#0369a1" }}>
            Current member intro preview
          </span>
          <span style={{ fontSize: 10, color: "#78716c" }}>what members see when the gate is on</span>
          {loading ? (
            <span style={{ fontSize: 10, color: "#a8a29e" }}>…</span>
          ) : enabled ? (
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
              LIVE: {enabled.title}
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
              No enabled row
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
          {loading && (
            <p style={{ fontSize: 13, color: "#a8a29e", margin: 0 }}>Loading preview…</p>
          )}

          {!loading && !enabled && (
            <p style={{ fontSize: 13, color: "#57534e", margin: 0, lineHeight: 1.5 }}>
              No repository row is enabled. Enable one above, or members will not see the watch-once gate
              (even when <code style={{ fontSize: 11 }}>MEMBER_VIDEO_GATE_ENABLED=true</code>).
            </p>
          )}

          {!loading && enabled && (
            <>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1c1917" }}>{enabled.title}</div>
                <div style={{ fontSize: 12, color: "#78716c", marginTop: 4 }}>
                  {enabled.caption} · {enabled.slug}
                </div>
                {enabled.notes && (
                  <div style={{ fontSize: 11, color: "#a8a29e", marginTop: 6 }}>{enabled.notes}</div>
                )}
                <div
                  style={{
                    fontSize: 11,
                    color: "#57534e",
                    marginTop: 8,
                    wordBreak: "break-all",
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  {previewSrc ?? "(no video URL)"}
                </div>
              </div>

              {previewSrc ? (
                <div
                  style={{
                    borderRadius: 14,
                    overflow: "hidden",
                    border: "1px solid #e7e5e4",
                    background: "#0c0a09",
                    maxWidth: 640,
                  }}
                >
                  <video
                    key={previewSrc}
                    src={previewSrc}
                    controls
                    playsInline
                    preload="metadata"
                    style={{ width: "100%", display: "block", maxHeight: 360 }}
                  />
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "#b45309", margin: 0 }}>
                  Enabled row has no video URL — add an MP4 path or HeyGen link in the repository above.
                </p>
              )}

              <p style={{ fontSize: 11, color: "#a8a29e", margin: "12px 0 0", lineHeight: 1.45 }}>
                Preview uses controls (unlike the member gate). Bundled fallback:{" "}
                <code style={{ fontSize: 10 }}>{BUNDLED_INTRO_PATH}</code> when the row has no URL.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
