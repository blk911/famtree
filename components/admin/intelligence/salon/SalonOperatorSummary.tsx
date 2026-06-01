"use client";

type Pill = { label: string; value: number; color?: string };

type Props = {
  pills: Pill[];
};

export function SalonOperatorSummary({ pills }: Props) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.06em", marginBottom: 8 }}>
        OPERATOR SUMMARY
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {pills.map((pill) => (
          <div
            key={pill.label}
            style={{
              background: "#fff",
              border: "1px solid #e7e5e4",
              borderRadius: 999,
              padding: "8px 14px",
              display: "flex",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 850, color: pill.color ?? "#1c1917" }}>{pill.value}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#57534e" }}>{pill.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
