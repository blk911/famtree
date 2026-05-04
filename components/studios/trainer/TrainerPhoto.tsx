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
};

export function TrainerPhoto({ displayName, imageUrl, accent }: Props) {
  const src =
    typeof imageUrl === "string" && imageUrl.trim().length > 0 ? imageUrl.trim() : null;
  const [showImg, setShowImg] = useState(Boolean(src));

  if (!showImg || !src) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          aspectRatio: "4/5",
          borderRadius: "24px",
          background: `linear-gradient(145deg, ${accent}33 0%, #fff 55%, ${accent}22 100%)`,
          border: `1px solid ${STUDIOS_LINE}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06), 0 12px 32px rgba(0, 0, 0, 0.08)",
        }}
        aria-hidden
      >
        <span
          style={{
            fontSize: "clamp(48px, 12vw, 72px)",
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
        maxWidth: "420px",
        aspectRatio: "4/5",
        borderRadius: "24px",
        objectFit: "cover",
        border: `1px solid ${STUDIOS_LINE}`,
        display: "block",
        margin: "0 auto",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06), 0 12px 32px rgba(0, 0, 0, 0.08)",
      }}
    />
  );
}
