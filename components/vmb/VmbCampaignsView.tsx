import { VmbCard } from "@/components/vmb/VmbCard";
import { VmbPageIntro } from "@/components/vmb/VmbPageIntro";
import { DEMO_CAMPAIGNS } from "@/lib/vmb/demo-data";
import { VMB_THEME } from "@/lib/vmb/theme";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  scheduled: "Scheduled",
  draft: "Draft",
};

export function VmbCampaignsView() {
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 24px 72px" }}>
      <VmbPageIntro
        eyebrow="Campaigns"
        title="Client-powered campaigns"
        description="Birthdays, referrals, seasonal moments, and trusted circle welcomes — without extra staff work."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {DEMO_CAMPAIGNS.map((campaign) => (
          <VmbCard key={campaign.id} padding="lg">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{campaign.name}</h2>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: VMB_THEME.muted,
                  whiteSpace: "nowrap",
                }}
              >
                {STATUS_LABEL[campaign.status]}
              </span>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: 15, lineHeight: 1.55, color: VMB_THEME.muted }}>
              {campaign.description}
            </p>
            {campaign.estimatedReach != null ? (
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: VMB_THEME.accent }}>
                Reach: {campaign.estimatedReach} clients
              </p>
            ) : null}
          </VmbCard>
        ))}
      </div>
    </div>
  );
}
