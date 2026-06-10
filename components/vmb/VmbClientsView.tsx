import { VmbCard } from "@/components/vmb/VmbCard";
import { VmbPageIntro } from "@/components/vmb/VmbPageIntro";
import { DEMO_CLIENTS } from "@/lib/vmb/demo-data";
import { VMB_THEME } from "@/lib/vmb/theme";

export function VmbClientsView() {
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 24px 72px" }}>
      <VmbPageIntro
        eyebrow="Clients"
        title="Your client book"
        description="Each client carries a trusted beauty network. VMB maps who they already know across hair, nails, skin, wax, and massage."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {DEMO_CLIENTS.map((client) => (
          <VmbCard key={client.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{client.name}</h2>
                <p style={{ margin: "4px 0 0", fontSize: 14, color: VMB_THEME.muted }}>
                  {client.primaryServiceLabel} ✓
                  {client.lastVisit ? ` · Last visit ${client.lastVisit}` : ""}
                </p>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: client.status === "lapsed" ? "#b45309" : client.status === "vip" ? VMB_THEME.accent : VMB_THEME.muted,
                  alignSelf: "flex-start",
                }}
              >
                {client.status}
              </span>
            </div>

            <p
              style={{
                margin: "0 0 10px",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: VMB_THEME.muted,
              }}
            >
              Trusted Providers
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {client.trustedProviders.map((slot) => (
                <div
                  key={`${client.id}-${slot.category}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: slot.status === "connected" ? VMB_THEME.successSoft : VMB_THEME.warmBg,
                    border: `1px solid ${VMB_THEME.line}`,
                    fontSize: 14,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{slot.category}</span>
                  <span style={{ color: VMB_THEME.muted }}>
                    {slot.providerName ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </VmbCard>
        ))}
      </div>
    </div>
  );
}
