"use client";

type Step = { label: string; value: number };

type Props = {
  steps: Step[];
};

export function SalonPipelineStatus({ steps }: Props) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.06em", marginBottom: 8 }}>
        PIPELINE
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          background: "#fafaf9",
          border: "1px solid #e7e5e4",
          borderRadius: 12,
          padding: "12px 16px",
        }}
      >
        {steps.map((step, i) => (
          <span key={step.label} style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#57534e" }}>
              <strong style={{ fontSize: 16, color: "#1c1917", marginRight: 6 }}>{step.value}</strong>
              {step.label}
            </span>
            {i < steps.length - 1 ? (
              <span style={{ fontSize: 14, color: "#d6d3d1", fontWeight: 700 }}>↓</span>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}
