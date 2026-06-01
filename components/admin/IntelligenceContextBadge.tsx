"use client";
// components/admin/IntelligenceContextBadge.tsx

type Props = {
  verticalLabel: string;
  dataScope: string;
};

export function IntelligenceContextBadge({ verticalLabel, dataScope }: Props) {
  return (
    <div
      style={{
        display: "inline-flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 6,
        marginTop: 10,
        padding: "6px 12px",
        background: "#fafaf9",
        border: "1px solid #e7e5e4",
        borderRadius: 8,
        fontSize: 11,
        color: "#57534e",
        lineHeight: 1.45,
      }}
    >
      <span>
        <strong style={{ color: "#44403c" }}>Active vertical:</strong> {verticalLabel}
      </span>
      <span style={{ color: "#d6d3d1" }}>·</span>
      <span>
        <strong style={{ color: "#44403c" }}>Data scope:</strong> {dataScope}
      </span>
    </div>
  );
}
