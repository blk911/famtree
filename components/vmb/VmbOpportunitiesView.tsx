import { VmbCard } from "@/components/vmb/VmbCard";
import { VmbPageIntro } from "@/components/vmb/VmbPageIntro";
import { DEMO_OPPORTUNITIES } from "@/lib/vmb/demo-data";
import { VMB_THEME } from "@/lib/vmb/theme";

export function VmbOpportunitiesView() {
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 24px 72px" }}>
      <VmbPageIntro
        eyebrow="Opportunities"
        title="Revenue waiting in your book"
        description="Opportunities surfaced from client relationships — not cold outreach."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {DEMO_OPPORTUNITIES.map((opp) => (
          <VmbCard key={opp.id} padding="lg">
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800 }}>{opp.title}</h2>
            <p style={{ margin: "0 0 20px", fontSize: 15, lineHeight: 1.55, color: VMB_THEME.muted }}>
              {opp.description}
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color: VMB_THEME.accent }}>
                ${opp.estimatedValue.toLocaleString()}
              </p>
              <p style={{ margin: 0, fontSize: 14, color: VMB_THEME.muted }}>
                {opp.count} {opp.type === "trusted_circle" ? "slots" : "targets"}
              </p>
            </div>
          </VmbCard>
        ))}
      </div>
    </div>
  );
}
