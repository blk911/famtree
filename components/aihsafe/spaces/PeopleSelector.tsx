"use client";

import type { MemberCandidate } from "@/components/aihsafe/people/memberCandidates";

const rowStyle: React.CSSProperties = {
  display:      "flex",
  alignItems:   "flex-start",
  gap:          10,
  padding:      "8px 10px",
  borderRadius: 10,
  border:       "1px solid #f0efee",
  background:   "#fafaf9",
  marginBottom: 6,
  cursor:       "pointer",
};

export function PeopleSelector({
  people,
  selectedIds,
  onChange,
  emptyMessage = "No trusted people in your network yet. You can invite someone in the next step.",
}: {
  people: MemberCandidate[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  emptyMessage?: string;
}) {
  if (people.length === 0) {
    return <p style={{ fontSize: 13, color: "#78716c", margin: 0, lineHeight: 1.45 }}>{emptyMessage}</p>;
  }

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  }

  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
      {people.map((p) => {
        const checked = selectedIds.includes(p.userId);
        return (
          <li key={p.userId}>
            <label style={rowStyle}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(p.userId)}
                style={{ marginTop: 3, flexShrink: 0 }}
              />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 600, fontSize: 14, color: "#1c1917" }}>
                  {p.displayName}
                </span>
                <span style={{ fontSize: 12, color: "#78716c" }}>{p.sources.join(" · ")}</span>
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
