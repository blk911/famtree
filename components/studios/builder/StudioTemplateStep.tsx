"use client";

import type { StudioTemplateType } from "@/types/studios/builder";
import { STUDIO_BUILDER_TEMPLATES } from "@/lib/studios/builder/templates";

type Props = {
  selected: StudioTemplateType | null;
  onSelect: (id: StudioTemplateType) => void;
};

export function StudioTemplateStep({ selected, onSelect }: Props) {
  return (
    <div>
      <h2
        style={{
          margin: "0 0 8px",
          fontSize: 22,
          fontWeight: 700,
          color: "#1c1917",
          letterSpacing: "-0.02em",
        }}
      >
        Choose your studio type
      </h2>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: "#78716c", lineHeight: 1.5 }}>
        Pick the lens that fits your community. You can change this before publishing.
      </p>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        }}
      >
        {STUDIO_BUILDER_TEMPLATES.map((t) => {
          const isSelected = selected === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onSelect(t.id)}
                aria-pressed={isSelected}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "16px 18px",
                  borderRadius: 18,
                  border: isSelected ? "2px solid #57534e" : "1px solid rgba(28,25,23,0.12)",
                  background: isSelected ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.72)",
                  boxShadow: isSelected
                    ? "0 4px 14px rgba(0,0,0,0.08)"
                    : "0 1px 4px rgba(0,0,0,0.05)",
                  cursor: "pointer",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "#a8a29e",
                    marginBottom: 6,
                  }}
                >
                  {t.audience}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 17,
                    fontWeight: 700,
                    color: "#1c1917",
                    marginBottom: 6,
                  }}
                >
                  {t.title}
                </span>
                <span style={{ display: "block", fontSize: 13, color: "#57534e", lineHeight: 1.45 }}>
                  {t.description}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
