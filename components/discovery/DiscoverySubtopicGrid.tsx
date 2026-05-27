"use client";
// components/discovery/DiscoverySubtopicGrid.tsx
// Renders subtopic chips for a subject page.
// MVP: visual only — future versions can filter content by subtopic.

import type { Subtopic } from "@/lib/discovery/types";

interface Props {
  subtopics: Subtopic[];
  accentColor: string;
}

export function DiscoverySubtopicGrid({ subtopics, accentColor }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
      }}
    >
      {subtopics.map((st) => (
        <span
          key={st.id}
          style={{
            display: "inline-block",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.02em",
            color: accentColor,
            background: `${accentColor}16`,
            border: `1px solid ${accentColor}28`,
            borderRadius: 8,
            padding: "6px 14px",
            cursor: "default",
            userSelect: "none",
            transition: "background 0.14s, border-color 0.14s",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = `${accentColor}28`;
            el.style.borderColor = `${accentColor}50`;
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = `${accentColor}16`;
            el.style.borderColor = `${accentColor}28`;
          }}
        >
          {st.label}
        </span>
      ))}
    </div>
  );
}
