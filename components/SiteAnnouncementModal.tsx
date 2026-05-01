"use client";

import { Megaphone, X } from "lucide-react";

type Announcement = { id: string; title: string; body: string };

export function SiteAnnouncementModal({
  announcement,
  viewCount,
  onClose,
  onDismissForever,
}: {
  announcement: Announcement;
  viewCount: number;
  onClose: () => void;
  onDismissForever: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.58)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white", borderRadius: "20px",
          maxWidth: "480px", width: "100%",
          boxShadow: "0 32px 80px rgba(0,0,0,0.35)",
          overflow: "hidden",
          animation: "slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {/* Header bar */}
        <div style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)",
          padding: "20px 20px 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Megaphone style={{ width: 16, height: 16, color: "#fbbf24", flexShrink: 0 }} />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Family Network Update
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "8px",
              padding: "5px", cursor: "pointer", color: "white", lineHeight: 0,
            }}
          >
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 24px 16px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#1c1917", marginBottom: "12px", lineHeight: 1.3 }}>
            {announcement.title}
          </h2>
          <p style={{ fontSize: "14px", color: "#44403c", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
            {announcement.body}
          </p>
        </div>

        {/* Shows-twice note */}
        {viewCount < 2 && (
          <p style={{ fontSize: "11px", color: "#c4bfba", textAlign: "center", padding: "0 24px 4px" }}>
            {viewCount === 0
              ? "This will appear once more on your next visit."
              : "This is the last time this will appear automatically."}
          </p>
        )}

        {/* Footer */}
        <div style={{
          padding: "16px 24px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px",
          borderTop: "1px solid #f5f4f0", marginTop: "12px",
        }}>
          <button
            onClick={onDismissForever}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: "12px", color: "#a8a29e", textDecoration: "underline", padding: 0,
            }}
          >
            Don&apos;t show this again
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "10px 28px", background: "#1c1917", color: "white",
              borderRadius: "12px", fontWeight: 700, fontSize: "14px",
              border: "none", cursor: "pointer",
            }}
          >
            Got it
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </div>
  );
}
