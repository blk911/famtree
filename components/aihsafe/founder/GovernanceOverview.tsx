"use client";

import { SectionHeader } from "@/components/aihsafe/common/SectionHeader";

interface Tile {
  label:   string;
  value:   number;
  icon:    string;
  accent:  string;
  detail?: string;
}

interface Props {
  familyCount:    number;
  spaceCount:     number;
  trustedAdults:  number;
  membershipCount: number;
  loading:        boolean;
}

export function GovernanceOverview({
  familyCount,
  spaceCount,
  trustedAdults,
  membershipCount,
  loading,
}: Props) {
  const tiles: Tile[] = [
    { label: "Family groups",    value: familyCount,     icon: "🏠", accent: "#0f3460", detail: "household circles" },
    { label: "Trusted spaces",   value: spaceCount,      icon: "🤝", accent: "#7c3aed", detail: "governed circles" },
    { label: "Trusted adults",   value: trustedAdults,   icon: "🛡", accent: "#065f46", detail: "guardians & coaches" },
    { label: "Active memberships", value: membershipCount, icon: "◆", accent: "#92400e", detail: "across all spaces" },
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
      <SectionHeader title="Governance Overview" />

      <div
        style={{
          display:             "grid",
          gridTemplateColumns: "1fr 1fr",
          gap:                 10,
        }}
      >
        {tiles.map(tile => (
          <div
            key={tile.label}
            style={{
              background:   "#fafaf9",
              borderRadius: 12,
              border:       "1px solid #e7e5e4",
              padding:      "14px 16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 16 }}>{tile.icon}</span>
              <span
                style={{
                  fontWeight:    800,
                  fontSize:      22,
                  color:         loading ? "#d6d3d1" : tile.accent,
                  lineHeight:    1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {loading ? "–" : tile.value}
              </span>
            </div>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#1c1917" }}>
              {tile.label}
            </div>
            {tile.detail && (
              <div style={{ fontSize: 11, color: "#a8a29e", marginTop: 2 }}>
                {tile.detail}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
