"use client";

type Pill = { label: string; value: number; color?: string };

type PipelineStep = { label: string; value: number };

type Props = {
  pills: Pill[];
  /** Compact horizontal status rail (Prospects operator screen). */
  compact?: boolean;
  /** Tiny inline breadcrumb, e.g. Source > Qualified > Campaign */
  pipeline?: PipelineStep[];
};

export function SalonOperatorSummary({ pills, compact = false, pipeline }: Props) {
  return (
    <div style={{ marginBottom: compact ? 8 : 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: compact ? 5 : 8, flex: "1 1 auto" }}>
          {pills.map((pill) => (
            <div
              key={pill.label}
              style={{
                background: "#fff",
                border: "1px solid #e7e5e4",
                borderRadius: 999,
                padding: compact ? "4px 10px" : "8px 14px",
                display: "flex",
                alignItems: "baseline",
                gap: compact ? 5 : 8,
              }}
            >
              <span
                style={{
                  fontSize: compact ? 14 : 18,
                  fontWeight: 850,
                  color: pill.color ?? "#1c1917",
                  lineHeight: 1,
                }}
              >
                {pill.value}
              </span>
              <span style={{ fontSize: compact ? 10 : 11, fontWeight: 700, color: "#57534e" }}>
                {pill.label}
              </span>
            </div>
          ))}
        </div>
        {pipeline && pipeline.length > 0 ? (
          <div
            style={{
              fontSize: 10,
              color: "#a8a29e",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {pipeline.map((step, i) => (
              <span key={step.label}>
                {i > 0 ? <span style={{ margin: "0 5px", color: "#d6d3d1" }}>&gt;</span> : null}
                <span style={{ color: "#78716c" }}>{step.label}</span>
                <span style={{ marginLeft: 4, fontWeight: 800, color: "#57534e" }}>{step.value}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
