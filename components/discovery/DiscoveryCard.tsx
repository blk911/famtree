"use client";
// components/discovery/DiscoveryCard.tsx

import type { DiscoveryItem } from "@/lib/discovery/catalog";
import { Play } from "lucide-react";

interface Props {
  item: DiscoveryItem;
  onPlay: (item: DiscoveryItem) => void;
}

/** Pastel badge colours keyed by age tier */
const AGE_COLOURS: Record<string, { bg: string; text: string }> = {
  "K-2":      { bg: "rgba(34,197,94,0.18)",  text: "#4ade80" },
  "3-5":      { bg: "rgba(59,130,246,0.18)", text: "#60a5fa" },
  "6-8":      { bg: "rgba(245,158,11,0.18)", text: "#fbbf24" },
  "9-12":     { bg: "rgba(239,68,68,0.18)",  text: "#f87171" },
  "All Ages": { bg: "rgba(168,85,247,0.18)", text: "#c084fc" },
};

/** Type badge colours */
const TYPE_COLOURS: Record<string, { bg: string; text: string }> = {
  Video:       { bg: "rgba(14,165,233,0.16)", text: "#38bdf8" },
  Series:      { bg: "rgba(99,102,241,0.16)", text: "#818cf8" },
  Interactive: { bg: "rgba(20,184,166,0.16)", text: "#2dd4bf" },
  "Mini-Doc":  { bg: "rgba(249,115,22,0.16)", text: "#fb923c" },
  Workshop:    { bg: "rgba(236,72,153,0.16)", text: "#f472b6" },
};

export function DiscoveryCard({ item, onPlay }: Props) {
  const ageBadge = AGE_COLOURS[item.ageTier] ?? AGE_COLOURS["All Ages"];
  const typeBadge = TYPE_COLOURS[item.itemType] ?? TYPE_COLOURS.Video;

  return (
    <article
      onClick={() => onPlay(item)}
      style={{
        flexShrink: 0,
        width: 220,
        borderRadius: 14,
        overflow: "hidden",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        cursor: "pointer",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 16px 40px rgba(0,0,0,0.45)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
      aria-label={`Play ${item.title}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onPlay(item); }}
    >
      {/* Thumbnail */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 10",
          background: item.thumbGradient,
        }}
      >
        {/* Play overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.18)",
            transition: "background 0.15s ease",
          }}
          className="dc-play-overlay"
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.18)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(255,255,255,0.28)",
            }}
          >
            <Play style={{ width: 18, height: 18, color: "#fff" }} fill="#fff" />
          </span>
        </div>

        {/* Duration pill */}
        <span
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            fontSize: 10,
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            background: "rgba(0,0,0,0.55)",
            borderRadius: 6,
            padding: "2px 7px",
            letterSpacing: "0.04em",
          }}
        >
          {item.duration}
        </span>

        {/* Safe badge */}
        <span
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            fontSize: 9,
            fontWeight: 800,
            color: "#4ade80",
            background: "rgba(20,83,45,0.72)",
            borderRadius: 6,
            padding: "2px 7px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            border: "1px solid rgba(74,222,128,0.3)",
          }}
        >
          Safe View
        </span>
      </div>

      {/* Meta */}
      <div style={{ padding: "10px 12px 12px" }}>
        {/* Badges row */}
        <div style={{ display: "flex", gap: 5, marginBottom: 7, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              borderRadius: 5,
              padding: "2px 6px",
              background: ageBadge.bg,
              color: ageBadge.text,
              letterSpacing: "0.04em",
            }}
          >
            {item.ageTier}
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              borderRadius: 5,
              padding: "2px 6px",
              background: typeBadge.bg,
              color: typeBadge.text,
              letterSpacing: "0.04em",
            }}
          >
            {item.itemType}
            {item.episodes ? ` · ${item.episodes} eps` : ""}
          </span>
        </div>

        <h3
          style={{
            margin: "0 0 5px",
            fontSize: 13,
            fontWeight: 800,
            color: "rgba(255,255,255,0.95)",
            letterSpacing: "-0.02em",
            lineHeight: 1.3,
          }}
        >
          {item.title}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            lineHeight: 1.45,
            color: "rgba(255,255,255,0.50)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.description}
        </p>
      </div>
    </article>
  );
}
