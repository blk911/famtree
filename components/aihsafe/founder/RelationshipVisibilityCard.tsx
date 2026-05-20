"use client";

import type { FamilyUnitDTO, TrustUnitDTO } from "@/types/aihsafe/dto";
import { getActiveTrustUnits } from "@/lib/trust/display";

interface Props {
  familyUnits:   FamilyUnitDTO[];
  trustUnits:    TrustUnitDTO[];
  currentUserId: string;
}

export function RelationshipVisibilityCard({ familyUnits, trustUnits, currentUserId }: Props) {
  const mySpaces = getActiveTrustUnits(
    trustUnits.filter(u => u.members.some(m => m.userId === currentUserId && !m.exitedAt)),
    currentUserId,
  );

  const circles: { icon: string; label: string; kind: "family" | "space" }[] = [
    ...familyUnits.map(f => ({ icon: "🏠", label: f.name, kind: "family" as const })),
    ...mySpaces.map(s => ({ icon: "🤝", label: s.name ?? `${s.kind} space`, kind: "space" as const })),
  ];

  return (
    <div
      style={{
        background:   "#fff",
        borderRadius: 16,
        border:       "1px solid #e7e5e4",
        padding:      "20px 22px",
        marginBottom: 14,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2
          style={{
            margin:        0,
            fontWeight:    700,
            fontSize:      11,
            color:         "#a8a29e",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom:  6,
          }}
        >
          Relationship Visibility
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: "#44403c", lineHeight: 1.5 }}>
          Visibility follows circle membership — not public discovery.
        </p>
      </div>

      {/* Current circles */}
      {circles.length > 0 ? (
        <div>
          <div
            style={{
              fontSize:      11,
              fontWeight:    700,
              color:         "#a8a29e",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              marginBottom:  10,
            }}
          >
            Your active circles
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {circles.map((c, i) => (
              <span
                key={i}
                style={{
                  display:      "inline-flex",
                  alignItems:   "center",
                  gap:          6,
                  background:   c.kind === "family" ? "#eff6ff" : "#faf5ff",
                  border:       `1px solid ${c.kind === "family" ? "#bfdbfe" : "#e9d5ff"}`,
                  color:        c.kind === "family" ? "#1e40af" : "#6d28d9",
                  borderRadius: 20,
                  padding:      "5px 12px",
                  fontSize:     12,
                  fontWeight:   600,
                }}
              >
                {c.icon} {c.label}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "#a8a29e", margin: 0 }}>
          No circles yet. Create a family group or trusted space to establish visibility boundaries.
        </p>
      )}
    </div>
  );
}
