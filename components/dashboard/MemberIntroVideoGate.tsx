"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ActiveVideo = {
  id: string;
  title: string;
  caption: string;
  videoUrl: string;
};

export function MemberIntroVideoGate() {
  const [active, setActive] = useState<ActiveVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const maxWatchedRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/dashboard/member-video", { credentials: "include" });
      const data = await r.json();
      if (r.ok && data.active) setActive(data.active);
      else setActive(null);
    } catch {
      setActive(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markComplete = useCallback(async (messageId: string) => {
    await fetch("/api/dashboard/member-video/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ messageId }),
    }).catch(() => null);
    setCompleted(true);
    setActive(null);
  }, []);

  const handleEnded = () => {
    if (active) void markComplete(active.id);
  };

  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    const allowedEnd = maxWatchedRef.current * el.duration;
    if (el.currentTime > allowedEnd + 2) {
      el.currentTime = allowedEnd;
      return;
    }
    maxWatchedRef.current = Math.max(maxWatchedRef.current, el.currentTime / el.duration);
  };

  if (loading || !active || completed) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={active.title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        background: "rgba(28,25,23,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          maxWidth: 560,
          width: "100%",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            background: "linear-gradient(135deg,#1a1a2e,#0f3460)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#fff" }}>{active.title}</h2>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "4px 10px",
              borderRadius: 999,
              background: "#fbbf24",
              color: "#1a1a2e",
              flexShrink: 0,
            }}
          >
            {active.caption}
          </span>
        </div>

        <div style={{ background: "#0f172a", lineHeight: 0 }}>
          <video
            ref={videoRef}
            src={active.videoUrl}
            controls
            playsInline
            onEnded={handleEnded}
            onTimeUpdate={handleTimeUpdate}
            style={{ width: "100%", maxHeight: "min(52vh, 400px)", display: "block" }}
          />
        </div>

        <p style={{ margin: 0, padding: "14px 20px", fontSize: 13, color: "#57534e", lineHeight: 1.45 }}>
          Please watch the full message once. Your dashboard opens when the video finishes.
        </p>
      </div>
    </div>
  );
}
