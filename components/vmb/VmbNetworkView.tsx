import { VmbCard } from "@/components/vmb/VmbCard";
import { VmbPageIntro } from "@/components/vmb/VmbPageIntro";
import { DEMO_TRUSTED_CIRCLE } from "@/lib/vmb/demo-data";
import { VMB_THEME } from "@/lib/vmb/theme";

export function VmbNetworkView() {
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 24px 72px" }}>
      <VmbPageIntro
        title="Trusted Beauty Circle"
        description={`${DEMO_TRUSTED_CIRCLE.clientCount} clients · ${DEMO_TRUSTED_CIRCLE.providers.length} trusted providers in your circle`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DEMO_TRUSTED_CIRCLE.providers.map((provider) => (
          <VmbCard key={provider.id}>
            <p
              style={{
                margin: "0 0 4px",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: VMB_THEME.accent,
              }}
            >
              {provider.category}
            </p>
            <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800 }}>{provider.name}</h2>
            {provider.specialty ? (
              <p style={{ margin: "0 0 12px", fontSize: 14, color: VMB_THEME.muted }}>
                {provider.specialty}
              </p>
            ) : null}
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                color: provider.status === "pending" ? "#b45309" : VMB_THEME.success,
              }}
            >
              {provider.status}
            </span>
          </VmbCard>
        ))}

        <VmbCard
          style={{
            borderStyle: "dashed",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
            minHeight: 160,
          }}
        >
          <p style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>Invite A Trusted Provider</p>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: VMB_THEME.muted }}>
            Expand your circle with nail, skin, wax, or massage providers your clients already trust.
          </p>
        </VmbCard>
      </div>
    </div>
  );
}
