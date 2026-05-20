"use client";

import { SectionHeader } from "@/components/aihsafe/common/SectionHeader";
import type { TrustUnitDTO } from "@/types/aihsafe/dto";
import {
  countDraftTrustUnits,
  getActiveTrustUnits,
  TRUST_CIRCLES_EMPTY_HINT,
  TRUST_CIRCLES_EMPTY_TITLE,
} from "@/lib/trust/display";

const KIND_COLORS: Record<string, string> = {
  family:   "#0f3460",
  peer:     "#7c3aed",
  extended: "#0369a1",
  guardian: "#065f46",
};

const KIND_ICONS: Record<string, string> = {
  family:   "🏠",
  peer:     "🤝",
  extended: "🌐",
  guardian: "🛡",
};

interface Props {
  units:         TrustUnitDTO[];
  currentUserId: string;
  loading:       boolean;
  onCreateClick: () => void;
}

const addBtn: React.CSSProperties = {
  background:   "transparent",
  border:       "1px solid #e7e5e4",
  borderRadius: 8,
  padding:      "4px 12px",
  fontSize:     12,
  fontWeight:   600,
  color:        "#44403c",
  cursor:       "pointer",
};

export function SpacesSnapshot({ units, currentUserId, loading, onCreateClick }: Props) {
  const myUnits = units.filter(u =>
    u.members.some(m => m.userId === currentUserId && !m.exitedAt)
  );
  const activeUnits = getActiveTrustUnits(myUnits, currentUserId);
  const draftCount = countDraftTrustUnits(myUnits, currentUserId);

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
      <SectionHeader
        title="Trusted Spaces"
        action={
          <button type="button" style={addBtn} onClick={onCreateClick}>
            + New
          </button>
        }
      />

      {loading && (
        <p style={{ fontSize: 13, color: "#a8a29e", margin: 0 }}>Loading…</p>
      )}

      {!loading && activeUnits.length === 0 && (
        <div style={{ textAlign: "center", padding: "18px 0" }}>
          <p style={{ fontSize: 13, color: "#a8a29e", margin: "0 0 6px", fontWeight: 600 }}>
            {TRUST_CIRCLES_EMPTY_TITLE}
          </p>
          <p style={{ fontSize: 12, color: "#a8a29e", margin: "0 0 10px", lineHeight: 1.45 }}>
            {TRUST_CIRCLES_EMPTY_HINT}
          </p>
          <button type="button" style={{ ...addBtn, border: "1px dashed #d6d3d1" }} onClick={onCreateClick}>
            + Create your first space
          </button>
        </div>
      )}

      {!loading && activeUnits.map(u => {
        const activeMembers = u.members.filter(m => !m.exitedAt).length;
        const color = KIND_COLORS[u.kind] ?? "#44403c";
        const icon  = KIND_ICONS[u.kind]  ?? "◆";

        return (
          <div
            key={u.id}
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          12,
              padding:      "10px 0",
              borderBottom: "1px solid #f5f5f4",
            }}
          >
            <div
              style={{
                width:          36,
                height:         36,
                borderRadius:   10,
                background:     `${color}15`,
                border:         `1px solid ${color}30`,
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                fontSize:       16,
                flexShrink:     0,
              }}
            >
              {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight:    600,
                  fontSize:      14,
                  color:         "#1c1917",
                  whiteSpace:    "nowrap",
                  overflow:      "hidden",
                  textOverflow:  "ellipsis",
                }}
              >
                {u.name ?? `${u.kind} space`}
              </div>
              <div style={{ fontSize: 12, color: "#a8a29e" }}>
                <span
                  style={{
                    display:      "inline-block",
                    padding:      "1px 7px",
                    borderRadius: 6,
                    background:   `${color}12`,
                    color:        color,
                    fontWeight:   600,
                    fontSize:     11,
                    marginRight:  6,
                  }}
                >
                  {u.kind}
                </span>
                {activeMembers} {activeMembers === 1 ? "member" : "members"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
