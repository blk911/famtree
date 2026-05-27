"use client";
// components/discovery/DiscoverySafeVideoModal.tsx
// MVP safe video modal — no external links, no comments, no feed.
// Shows a placeholder "Safe View demo" screen for now.

import { useEffect, useRef } from "react";
import { X, Play, RotateCcw, ShieldCheck } from "lucide-react";
import type { DiscoveryItem } from "@/lib/discovery/catalog";

interface Props {
  item: DiscoveryItem | null;
  onClose: () => void;
}

/** Pastel badge colours (duplicated from DiscoveryCard for self-containment) */
const AGE_COLOURS: Record<string, { bg: string; text: string }> = {
  "K-2":      { bg: "rgba(34,197,94,0.18)",  text: "#4ade80" },
  "3-5":      { bg: "rgba(59,130,246,0.18)", text: "#60a5fa" },
  "6-8":      { bg: "rgba(245,158,11,0.18)", text: "#fbbf24" },
  "9-12":     { bg: "rgba(239,68,68,0.18)",  text: "#f87171" },
  "All Ages": { bg: "rgba(168,85,247,0.18)", text: "#c084fc" },
};

export function DiscoverySafeVideoModal({ item, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Trap focus & keyboard close
  useEffect(() => {
    if (!item) return;
    closeRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  // Lock body scroll while open
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
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.88)",
          zIndex: 900,
          backdropFilter: "blur(6px)",
        }}
        aria-hidden
      />

      {/* Modal panel */}
      <div
        role="dialog"
        aria-modal
        aria-label={`Safe View: ${item.title}`}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 901,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 16px",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 720,
            borderRadius: 20,
            background: "#18181b",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
            overflow: "hidden",
            pointerEvents: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Video area — MVP placeholder */}
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
            {/* Gradient overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.48)",
              }}
              aria-hidden
            />

            {/* Safe View watermark */}
            <div
              style={{
                position: "absolute",
                top: 14,
                left: 14,
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontWeight: 800,
                color: "#4ade80",
                background: "rgba(20,83,45,0.72)",
                borderRadius: 8,
                padding: "4px 10px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                border: "1px solid rgba(74,222,128,0.3)",
                zIndex: 2,
              }}
            >
              <ShieldCheck style={{ width: 12, height: 12 }} />
              Safe View
            </div>

            {/* Close button */}
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close video"
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(0,0,0,0.55)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 2,
                transition: "background 0.15s",
              }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>

            {/* Placeholder content */}
            <div
              style={{
                position: "relative",
                zIndex: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                textAlign: "center",
                padding: "0 24px",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.12)",
                  backdropFilter: "blur(8px)",
                  border: "2px solid rgba(255,255,255,0.22)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Play style={{ width: 28, height: 28, color: "#fff" }} fill="#fff" />
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.72)",
                  maxWidth: 380,
                  lineHeight: 1.45,
                }}
              >
                Safe View demo — curated content player coming soon.
                <br />
                No ads, no external links, no comments.
              </p>
            </div>

            {/* Controls bar */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "12px 16px",
                background: "linear-gradient(transparent, rgba(0,0,0,0.72))",
                display: "flex",
                alignItems: "center",
                gap: 10,
                zIndex: 2,
              }}
            >
              <button
                type="button"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: "rgba(255,255,255,0.92)",
                  color: "#18181b",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  letterSpacing: "0.02em",
                }}
              >
                <Play style={{ width: 12, height: 12 }} fill="currentColor" />
                Watch
              </button>

              <button
                type="button"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.22)",
                  background: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.82)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: "0.02em",
                }}
              >
                <RotateCcw style={{ width: 12, height: 12 }} />
                Replay
              </button>

              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.45)",
                  fontWeight: 600,
                }}
              >
                {item.duration}
              </span>
            </div>
          </div>

          {/* Info strip */}
          <div style={{ padding: "16px 20px 18px" }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  borderRadius: 6,
                  padding: "2px 8px",
                  background: ageBadge.bg,
                  color: ageBadge.text,
                  letterSpacing: "0.04em",
                }}
              >
                {item.ageTier}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  borderRadius: 6,
                  padding: "2px 8px",
                  background: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.55)",
                  letterSpacing: "0.04em",
                }}
              >
                {item.itemType}
                {item.episodes ? ` · ${item.episodes} episodes` : ""}
              </span>
            </div>

            <h2
              style={{
                margin: "0 0 6px",
                fontSize: 18,
                fontWeight: 900,
                color: "#fff",
                letterSpacing: "-0.03em",
                lineHeight: 1.2,
              }}
            >
              {item.title}
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.5,
                color: "rgba(255,255,255,0.55)",
              }}
            >
              {item.description}
            </p>

            {/* Safety note */}
            <div
              style={{
                marginTop: 14,
                padding: "9px 12px",
                borderRadius: 10,
                background: "rgba(20,83,45,0.28)",
                border: "1px solid rgba(74,222,128,0.18)",
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <ShieldCheck
                style={{ width: 14, height: 14, color: "#4ade80", flexShrink: 0, marginTop: 1 }}
              />
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  lineHeight: 1.45,
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                <strong style={{ color: "#4ade80" }}>Safe View active.</strong> This player is
                fully contained — no external links, no comment sections, no autoplay rabbit holes.
                Watch, replay, or close. That&apos;s it.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
