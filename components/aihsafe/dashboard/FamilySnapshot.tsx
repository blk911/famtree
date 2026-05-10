"use client";

import { AvatarChip }    from "@/components/aihsafe/common/AvatarChip";
import { SectionHeader } from "@/components/aihsafe/common/SectionHeader";
import type { FamilyUnitDTO } from "@/types/aihsafe/dto";

interface Props {
  units:         FamilyUnitDTO[];
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
  display:      "flex",
  alignItems:   "center",
  gap:          4,
};

export function FamilySnapshot({ units, loading, onCreateClick }: Props) {
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
        title="Family Groups"
        action={
          <button type="button" style={addBtn} onClick={onCreateClick}>
            + New
          </button>
        }
      />

      {loading && (
        <p style={{ fontSize: 13, color: "#a8a29e", margin: 0 }}>Loading…</p>
      )}

      {!loading && units.length === 0 && (
        <div style={{ textAlign: "center", padding: "18px 0" }}>
          <p style={{ fontSize: 13, color: "#a8a29e", margin: "0 0 10px" }}>
            No family groups yet.
          </p>
          <button type="button" style={{ ...addBtn, border: "1px dashed #d6d3d1" }} onClick={onCreateClick}>
            + Create your first family group
          </button>
        </div>
      )}

      {!loading && units.map(u => (
        <div
          key={u.id}
          style={{
            display:        "flex",
            alignItems:     "center",
            gap:            12,
            padding:        "10px 0",
            borderBottom:   "1px solid #f5f5f4",
          }}
        >
          <AvatarChip name={u.name} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#1c1917", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {u.name}
            </div>
            <div style={{ fontSize: 12, color: "#a8a29e" }}>
              {u.members.length} {u.members.length === 1 ? "member" : "members"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
