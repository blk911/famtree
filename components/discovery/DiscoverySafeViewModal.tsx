"use client";
// components/discovery/DiscoverySafeViewModal.tsx
// AIH Safe View modal — controlled wrapper for approved content.
// No external links, no comments, no autoplay rabbit holes.
// MVP: placeholder player screen with Watch / Replay / Close.

import { useEffect, useRef } from "react";
import { X, Play, RotateCcw, ShieldCheck } from "lucide-react";
import type { DiscoveryItem } from "@/lib/discovery/types";

interface Props {
  item: DiscoveryItem | null;
  onClose: () => void;
}

const AGE_COLOURS: Record<string, { bg: string; text: string }> = {
  "K-2":      { bg: "rgba(34,197,94,0.18)",  text: "#4ade80" },
  "3-5":      { bg: "rgba(59,130,246,0.18)", text: "#60a5fa" },
  "6-8":      { bg: "rgba(245,158,11,0.18)", text: "#fbbf24" },
  "9-12":     { bg: "rgba(239,68,68,0.18)",  text: "#f87171" },
  "All Ages": { bg: "rgba(168,85,247,0.18)", text: "#c084fc" },
};

export function DiscoverySafeViewModal({ item, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!item) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  useEffect(() => {
    if (item) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [item]);

  if (!item) return null;

  const ageBadge = AGE_COLOURS[item.ageTier] ?? AGE_COLOURS["All Ages"];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.90)",
          zIndex: 900,
          backdropFilter: "blur(8px)",
        }}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal
        aria-label={`Safe View: ${item.title}`}
        style={{
          position: "fixed", inset: 0, zIndex: 901,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px 16px",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: "100%", maxWidth: 720,
            borderRadius: 20,
            background: "#141416",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.75)",
            overflow: "hidden",
            pointerEvents: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Video area */}
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "16 / 9",
              background: item.thumbGradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Overlay */}
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.46)" }} aria-hidden />

            {/* Safe View badge */}
            <div
              style={{
                position: "absolute", top: 14, left: 14, zIndex: 2,
                display: "flex", alignItems: "center", gap: 5,
                fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
                textTransform: "uppercase", color: "#4ade80",
                background: "rgba(20,83,45,0.75)",
                borderRadius: 8, padding: "4px 10px",
                border: "1px solid rgba(74,222,128,0.28)",
              }}
            >
              <ShieldCheck style={{ width: 11, height: 11 }} />
              Safe View
            </div>

            {/* Close */}
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                position: "absolute", top: 14, right: 14, zIndex: 2,
                width: 36, height: 36, borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(0,0,0,0.60)",
                color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>

            {/* Placeholder content */}
            <div
              style={{
                position: "relative", zIndex: 2,
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 14, textAlign: "center", padding: "0 28px",
              }}
            >
              <div
                style={{
                  width: 68, height: 68, borderRadius: "50%",
                  background: "rgba(255,255,255,0.12)",
                  backdropFilter: "blur(8px)",
                  border: "2px solid rgba(255,255,255,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Play style={{ width: 28, height: 28, color: "#fff" }} fill="#fff" />
              </div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.68)", maxWidth: 380, lineHeight: 1.5 }}>
                Approved content opens here inside AIH Safe View.
                <br />
                No ads · No comments · No external links.
              </p>
            </div>

            {/* Controls */}
            <div
              style={{
                position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 2,
                padding: "14px 16px",
                background: "linear-gradient(transparent, rgba(0,0,0,0.72))",
                display: "flex", alignItems: "center", gap: 10,
              }}
            >
              <button
                type="button"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "7px 16px", borderRadius: 10, border: "none",
                  background: "rgba(255,255,255,0.94)", color: "#141416",
                  fontSize: 12, fontWeight: 800, cursor: "pointer", letterSpacing: "0.02em",
                }}
              >
                <Play style={{ width: 11, height: 11 }} fill="currentColor" />
                Watch
              </button>
              <button
                type="button"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "7px 16px", borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.8)",
                  fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: "0.02em",
                }}
              >
                <RotateCcw style={{ width: 11, height: 11 }} />
                Replay
              </button>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.42)", fontWeight: 600 }}>
                {item.duration}
              </span>
            </div>
          </div>

          {/* Info strip */}
          <div style={{ padding: "16px 20px 20px" }}>
            {/* Badges */}
            <div style={{ display: "flex", gap: 6, marginBottom: 9, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "2px 8px", background: ageBadge.bg, color: ageBadge.text, letterSpacing: "0.04em" }}>
                {item.ageTier}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "2px 8px", background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.48)", letterSpacing: "0.04em" }}>
                {item.itemType}
                {item.episodes ? ` · ${item.episodes} eps` : ""}
                {item.difficulty ? ` · ${item.difficulty}` : ""}
              </span>
            </div>

            <h2 style={{ margin: "0 0 7px", fontSize: 19, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.2 }}>
              {item.title}
            </h2>
            <p style={{ margin: "0 0 14px", fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.52)" }}>
              {item.description}
            </p>

            {/* Safety note */}
            <div
              style={{
                padding: "9px 12px", borderRadius: 10,
                background: "rgba(20,83,45,0.22)",
                border: "1px solid rgba(74,222,128,0.16)",
                display: "flex", alignItems: "flex-start", gap: 8,
              }}
            >
              <ShieldCheck style={{ width: 13, height: 13, color: "#4ade80", flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 11, lineHeight: 1.45, color: "rgba(255,255,255,0.50)" }}>
                <strong style={{ color: "#4ade80" }}>Safe View active.</strong>{" "}
                This player is fully contained — no external links, no comment sections, no autoplay rabbit holes.
                Watch, replay, or close.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
