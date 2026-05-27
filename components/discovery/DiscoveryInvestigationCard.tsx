"use client";
// components/discovery/DiscoveryInvestigationCard.tsx
// Museum-exhibit style card for investigations, mini-docs, workshops, etc.
// Designed to feel like Discovery+ / PBS — not a YouTube thumbnail farm.

import { Play, ShieldCheck } from "lucide-react";
import type { DiscoveryItem } from "@/lib/discovery/types";

interface Props {
  item: DiscoveryItem;
  onPlay: (item: DiscoveryItem) => void;
  /** Optional: wider card for project grids */
  wide?: boolean;
}

const AGE_COLOURS: Record<string, { bg: string; text: string }> = {
  "K-2":      { bg: "rgba(34,197,94,0.16)",  text: "#4ade80" },
  "3-5":      { bg: "rgba(59,130,246,0.16)", text: "#60a5fa" },
  "6-8":      { bg: "rgba(245,158,11,0.16)", text: "#fbbf24" },
  "9-12":     { bg: "rgba(239,68,68,0.16)",  text: "#f87171" },
  "All Ages": { bg: "rgba(168,85,247,0.16)", text: "#c084fc" },
};

const TYPE_COLOURS: Record<string, string> = {
  Investigation: "#60a5fa",
  "Mini-Doc":    "#fb923c",
  Workshop:      "#f472b6",
  Interactive:   "#2dd4bf",
  Project:       "#a78bfa",
  Trail:         "#fbbf24",
  Collection:    "#86efac",
};

export function DiscoveryInvestigationCard({ item, onPlay, wide = false }: Props) {
  const ageBadge = AGE_COLOURS[item.ageTier] ?? AGE_COLOURS["All Ages"];
  const typeColor = TYPE_COLOURS[item.itemType] ?? "#fff";

  return (
    <article
      onClick={() => onPlay(item)}
      role="button"
      tabIndex={0}
      aria-label={`Open ${item.title}`}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onPlay(item); }}
      style={{
        flexShrink: 0,
        width: wide ? 280 : 240,
        borderRadius: 14,
        overflow: "hidden",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        cursor: "pointer",
        transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = "translateY(-4px)";
        el.style.boxShadow = `0 16px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.12)`;
        el.style.borderColor = "rgba(255,255,255,0.14)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "none";
        el.style.borderColor = "rgba(255,255,255,0.07)";
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          background: item.thumbGradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Overlay */}
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.22)" }} aria-hidden />

        {/* Safe View badge */}
        <span
          style={{
            position: "absolute", top: 8, left: 8, zIndex: 2,
            fontSize: 9, fontWeight: 800, letterSpacing: "0.07em",
            textTransform: "uppercase", color: "#4ade80",
            background: "rgba(20,83,45,0.72)",
            borderRadius: 5, padding: "2px 6px",
            border: "1px solid rgba(74,222,128,0.28)",
            display: "flex", alignItems: "center", gap: 3,
          }}
        >
          <ShieldCheck style={{ width: 9, height: 9 }} />
          Safe
        </span>

        {/* Duration */}
        <span
          style={{
            position: "absolute", bottom: 8, right: 8, zIndex: 2,
            fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
            color: "rgba(255,255,255,0.9)",
            background: "rgba(0,0,0,0.56)",
            borderRadius: 5, padding: "2px 6px",
          }}
        >
          {item.duration}
        </span>

        {/* Play ring */}
        <div
          style={{
            position: "relative", zIndex: 2,
            width: 42, height: 42, borderRadius: "50%",
            background: "rgba(255,255,255,0.14)",
            backdropFilter: "blur(6px)",
            border: "1.5px solid rgba(255,255,255,0.26)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          <Play style={{ width: 16, height: 16, color: "#fff" }} fill="#fff" />
        </div>
      </div>

      {/* Meta */}
      <div style={{ padding: "10px 12px 14px", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Type + age badges */}
        <div style={{ display: "flex", gap: 5, marginBottom: 7, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.04em", color: typeColor }}>
            {item.itemType}
            {item.episodes ? ` · ${item.episodes} eps` : ""}
          </span>
          <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
          <span
            style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.04em",
              borderRadius: 5, padding: "1px 6px",
              background: ageBadge.bg, color: ageBadge.text,
            }}
          >
            {item.ageTier}
          </span>
        </div>

        <h3
          style={{
            margin: "0 0 5px",
            fontSize: 13, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.3,
            color: "rgba(255,255,255,0.95)",
            flex: 1,
          }}
        >
          {item.title}
        </h3>

        <p
          style={{
            margin: 0, fontSize: 11, lineHeight: 1.45,
            color: "rgba(255,255,255,0.40)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.description}
        </p>

        {/* Project extras */}
        {item.difficulty && item.buildTime && (
          <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
            <span
              style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.04em",
                borderRadius: 5, padding: "2px 6px",
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.45)",
              }}
            >
              {item.difficulty}
            </span>
            <span
              style={{
                fontSize: 9, fontWeight: 600,
                color: "rgba(255,255,255,0.30)",
              }}
            >
              {item.buildTime}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
