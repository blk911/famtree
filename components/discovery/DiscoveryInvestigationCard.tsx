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
  "K-2":      { bg: "rgba(22,163,74,0.12)",   text: "#16a34a" },
  "3-5":      { bg: "rgba(37,99,235,0.12)",   text: "#2563eb" },
  "6-8":      { bg: "rgba(217,119,6,0.12)",   text: "#d97706" },
  "9-12":     { bg: "rgba(220,38,38,0.12)",   text: "#dc2626" },
  "All Ages": { bg: "rgba(147,51,234,0.12)",  text: "#9333ea" },
};

const TYPE_COLOURS: Record<string, string> = {
  Investigation: "#2563eb",
  "Mini-Doc":    "#ea580c",
  Workshop:      "#db2777",
  Interactive:   "#0d9488",
  Project:       "#7c3aed",
  Trail:         "#d97706",
  Collection:    "#16a34a",
};

export function DiscoveryInvestigationCard({ item, onPlay, wide = false }: Props) {
  const ageBadge = AGE_COLOURS[item.ageTier] ?? AGE_COLOURS["All Ages"];
  const typeColor = TYPE_COLOURS[item.itemType] ?? "#1c1917";

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
        background: "#ffffff",
        border: "1px solid rgba(28,25,23,0.08)",
        boxShadow: "0 1px 6px rgba(28,25,23,0.05)",
        cursor: "pointer",
        transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = "translateY(-4px)";
        el.style.boxShadow = `0 14px 36px rgba(28,25,23,0.13), 0 0 0 1px rgba(28,25,23,0.10)`;
        el.style.borderColor = "rgba(28,25,23,0.14)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "0 1px 6px rgba(28,25,23,0.05)";
        el.style.borderColor = "rgba(28,25,23,0.08)";
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
          <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(28,25,23,0.18)", flexShrink: 0 }} />
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
            color: "#1c1917",
            flex: 1,
          }}
        >
          {item.title}
        </h3>

        <p
          style={{
            margin: 0, fontSize: 11, lineHeight: 1.45,
            color: "rgba(28,25,23,0.50)",
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
                background: "rgba(28,25,23,0.06)",
                color: "rgba(28,25,23,0.48)",
              }}
            >
              {item.difficulty}
            </span>
            <span
              style={{
                fontSize: 9, fontWeight: 600,
                color: "rgba(28,25,23,0.38)",
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
