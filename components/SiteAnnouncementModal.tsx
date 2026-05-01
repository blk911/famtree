"use client";

import { useEffect, useRef, useState } from "react";
import { Megaphone, X, Play, Pause, Volume2 } from "lucide-react";

type Announcement = { id: string; title: string; body: string };

const VOICE_SRC = "/audio/aih-voice-intro.mp3";

export function SiteAnnouncementModal({
  announcement,
  viewCount,
  showVoice = false,
  onClose,
  onDismissForever,
}: {
  announcement: Announcement;
  viewCount: number;
  showVoice?: boolean;
  onClose: () => void;
  onDismissForever: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);   // 0–100
  const [duration, setDuration] = useState(0);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  // Attempt autoplay when voice player is shown
  useEffect(() => {
    if (!showVoice || !audioRef.current) return;
    audioRef.current.play()
      .then(() => setPlaying(true))
      .catch(() => setAutoplayBlocked(true)); // browser blocked it — user must tap play
  }, [showVoice]);

  // Stop audio when modal unmounts
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    setProgress((el.currentTime / el.duration) * 100);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleEnded = () => setPlaying(false);

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    el.currentTime = pct * el.duration;
    setProgress(pct * 100);
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const elapsed = audioRef.current ? audioRef.current.currentTime : 0;

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
        {/* ── Header ────────────────────────────────────────────────────────── */}
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

        {/* ── Voice player (first view only) ────────────────────────────────── */}
        {showVoice && (
          <div style={{
            background: "linear-gradient(180deg, #0f1f3d 0%, #1a1a2e 100%)",
            padding: "18px 20px",
            display: "flex", flexDirection: "column", gap: "12px",
          }}>
            <audio
              ref={audioRef}
              src={VOICE_SRC}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
              preload="metadata"
            />

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* Play / Pause button */}
              <button
                onClick={togglePlay}
                style={{
                  width: 42, height: 42, borderRadius: "50%",
                  background: playing ? "rgba(251,191,36,0.2)" : "#fbbf24",
                  border: playing ? "2px solid #fbbf24" : "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", flexShrink: 0, transition: "all 0.15s",
                }}
              >
                {playing
                  ? <Pause style={{ width: 16, height: 16, color: "#fbbf24" }} />
                  : <Play  style={{ width: 16, height: 16, color: "#1a1a2e", marginLeft: 2 }} />
                }
              </button>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                {/* Label */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Volume2 style={{ width: 12, height: 12, color: "#94a3b8" }} />
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.04em" }}>
                    {autoplayBlocked && !playing ? "TAP TO PLAY · VOICE MESSAGE" : playing ? "NOW PLAYING" : "VOICE MESSAGE"}
                  </span>
                </div>

                {/* Progress bar */}
                <div
                  onClick={handleScrub}
                  style={{
                    height: 4, background: "rgba(255,255,255,0.12)",
                    borderRadius: 2, cursor: "pointer", position: "relative",
                  }}
                >
                  <div style={{
                    position: "absolute", left: 0, top: 0, bottom: 0,
                    width: `${progress}%`,
                    background: "#fbbf24", borderRadius: 2,
                    transition: "width 0.1s linear",
                  }} />
                </div>

                {/* Time */}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "10px", color: "#64748b" }}>{fmtTime(elapsed)}</span>
                  <span style={{ fontSize: "10px", color: "#64748b" }}>{duration ? fmtTime(duration) : "--:--"}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Body ──────────────────────────────────────────────────────────── */}
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

        {/* ── Footer ────────────────────────────────────────────────────────── */}
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
