"use client";

import { useState } from "react";
import { STUDIOS_LINE } from "@/lib/studios/visual";

function initialsFromDisplay(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

type Props = {
  displayName: string;
  imageUrl?: string | null;
  accent: string;
  /** ~25% shorter than default portrait for tighter hero layouts */
  compact?: boolean;
  /** When `compact`, caps tile width (e.g. align photo with adjacent video cards). */
  tileMaxWidth?: number;
};

export function TrainerPhoto({ displayName, imageUrl, accent, compact = false, tileMaxWidth }: Props) {
  const src =
    typeof imageUrl === "string" && imageUrl.trim().length > 0 ? imageUrl.trim() : null;
  const [showImg, setShowImg] = useState(Boolean(src));
  /** Default 4/5 portrait; compact uses wider ratio (~25% less height at same width). */
  const aspectRatio = compact ? "16/15" : "4/5";
  const maxWidth = compact ? (tileMaxWidth ?? 280) : 420;

  if (!showImg || !src) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: `${maxWidth}px`,
          aspectRatio,
          borderRadius: "24px",
          background: `linear-gradient(145deg, ${accent}33 0%, #fff 55%, ${accent}22 100%)`,
          border: `1px solid ${STUDIOS_LINE}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: compact ? "0" : "0 auto",
          boxShadow: compact
            ? "0 1px 2px rgba(0, 0, 0, 0.05), 0 8px 24px rgba(0, 0, 0, 0.07)"
            : "0 1px 3px rgba(0, 0, 0, 0.06), 0 12px 32px rgba(0, 0, 0, 0.08)",
        }}
        aria-hidden
      >
        <span
          style={{
            fontSize: compact ? "clamp(36px, 10vw, 56px)" : "clamp(48px, 12vw, 72px)",
            fontWeight: 700,
            letterSpacing: "-0.04em",
            color: accent,
          }}
        >
          {initialsFromDisplay(displayName)}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- intentional fallback flow
    <img
      src={src}
      alt={displayName}
      onError={() => setShowImg(false)}
      style={{
        width: "100%",
        maxWidth: `${maxWidth}px`,
        aspectRatio,
        borderRadius: "24px",
        objectFit: "cover",
        border: `1px solid ${STUDIOS_LINE}`,
        display: "block",
        margin: compact ? "0" : "0 auto",
        boxShadow: compact
          ? "0 1px 2px rgba(0, 0, 0, 0.05), 0 8px 24px rgba(0, 0, 0, 0.07)"
          : "0 1px 3px rgba(0, 0, 0, 0.06), 0 12px 32px rgba(0, 0, 0, 0.08)",
      }}
    />
  );
}
