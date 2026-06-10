import { VmbCard } from "@/components/vmb/VmbCard";
import { VmbPageIntro } from "@/components/vmb/VmbPageIntro";
import { DEMO_REVENUE_SUMMARY } from "@/lib/vmb/demo-data";
import { VMB_THEME } from "@/lib/vmb/theme";

const TOTAL = DEMO_REVENUE_SUMMARY.reduce((s, r) => s + r.value, 0);

export function VmbRevenueView() {
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 24px 72px" }}>
      <VmbPageIntro
        eyebrow="Revenue"
        title="Growth from trust"
        description="Revenue recovered through relationships — not ad spend."
      />

      <VmbCard padding="lg" style={{ marginBottom: 24 }}>
        <p style={{ margin: "0 0 6px", fontSize: 14, color: VMB_THEME.muted }}>Total tracked</p>
        <p
          style={{
            margin: 0,
            fontSize: "clamp(36px, 5vw, 48px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: VMB_THEME.accent,
          }}
        >
          ${TOTAL.toLocaleString()}
        </p>
      </VmbCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {DEMO_REVENUE_SUMMARY.map((row) => (
          <VmbCard key={row.id}>
            <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: VMB_THEME.muted }}>
              {row.label}
            </p>
            <p style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em" }}>
              ${row.value.toLocaleString()}
            </p>
          </VmbCard>
        ))}
      </div>
    </div>
  );
}
