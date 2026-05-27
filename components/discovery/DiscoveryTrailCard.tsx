"use client";
// components/discovery/DiscoveryTrailCard.tsx
// Displays a curated learning trail with a step-path visualization.

import { ArrowRight, BookOpen } from "lucide-react";
import type { DiscoveryTrail } from "@/lib/discovery/types";

interface Props {
  trail: DiscoveryTrail;
  /** Optional: override width for different contexts */
  fullWidth?: boolean;
}

const AGE_COLOURS: Record<string, { bg: string; text: string }> = {
  "K-2":      { bg: "rgba(34,197,94,0.16)",  text: "#4ade80" },
  "3-5":      { bg: "rgba(59,130,246,0.16)", text: "#60a5fa" },
  "6-8":      { bg: "rgba(245,158,11,0.16)", text: "#fbbf24" },
  "9-12":     { bg: "rgba(239,68,68,0.16)",  text: "#f87171" },
  "All Ages": { bg: "rgba(168,85,247,0.16)", text: "#c084fc" },
};

export function DiscoveryTrailCard({ trail, fullWidth = false }: Props) {
  const ageBadge = AGE_COLOURS[trail.ageTier] ?? AGE_COLOURS["All Ages"];

  return (
    <article
      style={{
        flexShrink: fullWidth ? undefined : 0,
        width: fullWidth ? "100%" : "min(320px, 90vw)",
        borderRadius: 16,
        overflow: "hidden",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = "translateY(-4px)";
        el.style.boxShadow = "0 16px 40px rgba(0,0,0,0.4)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "none";
      }}
    >
      {/* Gradient header strip */}
      <div
        style={{
          background: trail.thumbGradient,
          padding: "18px 18px 16px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(0,0,0,0.28)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <BookOpen style={{ width: 18, height: 18, color: "#fff" }} />
        </div>
        <span
          style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
            color: "rgba(255,255,255,0.72)",
            background: "rgba(0,0,0,0.32)",
            borderRadius: 20, padding: "3px 8px",
            border: "1px solid rgba(255,255,255,0.12)",
            whiteSpace: "nowrap",
          }}
        >
          {trail.itemCount} stops
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: "14px 18px 18px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <h3
            style={{
              margin: "0 0 5px",
              fontSize: 14, fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 1.25,
              color: "rgba(255,255,255,0.95)",
            }}
          >
            {trail.title}
          </h3>
          <p
            style={{
              margin: 0, fontSize: 11, lineHeight: 1.5,
              color: "rgba(255,255,255,0.45)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {trail.description}
          </p>
        </div>

        {/* Step path */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            flexWrap: "wrap",
            rowGap: 4,
          }}
        >
          {trail.steps.map((step, i) => (
            <span key={step} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.02em",
                  color: "rgba(255,255,255,0.72)",
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: 6, padding: "2px 7px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  whiteSpace: "nowrap",
                }}
              >
                {step}
              </span>
              {i < trail.steps.length - 1 && (
                <ArrowRight style={{ width: 10, height: 10, color: "rgba(255,255,255,0.24)", flexShrink: 0 }} />
              )}
            </span>
          ))}
        </div>

        {/* Age badge */}
        <div>
          <span
            style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
              borderRadius: 6, padding: "2px 8px",
              background: ageBadge.bg, color: ageBadge.text,
            }}
          >
            {trail.ageTier}
          </span>
        </div>
      </div>
    </article>
  );
}
