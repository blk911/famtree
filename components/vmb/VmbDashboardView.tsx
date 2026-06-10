import Link from "next/link";
import { VmbCard } from "@/components/vmb/VmbCard";
import { DEMO_DASHBOARD_CARDS, DEMO_DASHBOARD_HERO } from "@/lib/vmb/demo-data";
import { VMB_THEME } from "@/lib/vmb/theme";

export function VmbDashboardView() {
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 24px 72px" }}>
      <div
        style={{
          marginBottom: 40,
          padding: "40px 32px",
          borderRadius: 22,
          background: `linear-gradient(135deg, ${VMB_THEME.accentSoft} 0%, #fff 70%)`,
          border: `1px solid ${VMB_THEME.line}`,
        }}
      >
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: VMB_THEME.accent,
          }}
        >
          {DEMO_DASHBOARD_HERO.salonName}
        </p>
        <h1
          style={{
            margin: "0 0 8px",
            fontSize: "clamp(32px, 4vw, 44px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
          }}
        >
          {DEMO_DASHBOARD_HERO.subtitle}
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: "clamp(36px, 5vw, 52px)",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            color: VMB_THEME.accent,
          }}
        >
          ${DEMO_DASHBOARD_HERO.potentialRevenue.toLocaleString()}
        </p>
      </div>

      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {DEMO_DASHBOARD_CARDS.map((card) => (
          <VmbCard key={card.id}>
            <p
              style={{
                margin: "0 0 8px",
                fontSize: 13,
                fontWeight: 600,
                color: VMB_THEME.muted,
              }}
            >
              {card.label}
            </p>
            {card.value != null ? (
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: 28,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                }}
              >
                {card.value}
              </p>
            ) : null}
            <p style={{ margin: 0, fontSize: 14, color: VMB_THEME.muted }}>
              {card.value != null ? card.unit : `$${card.amount.toLocaleString()} ${card.unit}`}
            </p>
            {card.value != null ? (
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: 15,
                  fontWeight: 700,
                  color: VMB_THEME.accent,
                }}
              >
                ${card.amount.toLocaleString()} potential
              </p>
            ) : null}
          </VmbCard>
        ))}
      </div>

      <p style={{ marginTop: 32, fontSize: 14, color: VMB_THEME.muted }}>
        <Link href="/vmb/start" style={{ color: VMB_THEME.accent, fontWeight: 600, textDecoration: "none" }}>
          Upload a new export
        </Link>
        {" · "}
        <Link href="/vmb/opportunities" style={{ color: VMB_THEME.accent, fontWeight: 600, textDecoration: "none" }}>
          Explore opportunities
        </Link>
      </p>
    </div>
  );
}
