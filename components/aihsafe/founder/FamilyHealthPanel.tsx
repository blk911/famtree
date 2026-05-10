"use client";

import { SectionHeader } from "@/components/aihsafe/common/SectionHeader";

interface HealthIndicator {
  label:   string;
  healthy: boolean;
  detail?: string;
}

interface Props {
  pendingApprovalCount: number;
  spaceCount:           number;
  pendingInviteCount:   number;
  trustedAdultCount:    number;
  loading:              boolean;
}

export function FamilyHealthPanel({
  pendingApprovalCount,
  spaceCount,
  pendingInviteCount,
  trustedAdultCount,
  loading,
}: Props) {
  const indicators: HealthIndicator[] = [
    {
      label:   pendingApprovalCount === 0 ? "Approvals clear" : `${pendingApprovalCount} approval${pendingApprovalCount === 1 ? "" : "s"} waiting`,
      healthy: pendingApprovalCount === 0,
      detail:  pendingApprovalCount === 0 ? "No guardian decisions needed" : "Review in the attention section above",
    },
    {
      label:   spaceCount === 0 ? "No spaces yet" : `${spaceCount} space${spaceCount === 1 ? "" : "s"} active`,
      healthy: spaceCount > 0,
      detail:  spaceCount === 0 ? "Create a trusted space to get started" : "Your governed circles are running",
    },
    {
      label:   pendingInviteCount === 0 ? "No open invites" : `${pendingInviteCount} invite${pendingInviteCount === 1 ? "" : "s"} pending`,
      healthy: pendingInviteCount === 0,
      detail:  pendingInviteCount === 0 ? "All invites resolved or none sent" : "Awaiting recipient acceptance",
    },
    {
      label:   trustedAdultCount === 0 ? "No trusted adults linked" : `${trustedAdultCount} trusted adult${trustedAdultCount === 1 ? "" : "s"}`,
      healthy: trustedAdultCount > 0,
      detail:  trustedAdultCount === 0 ? "Add a guardian to strengthen the network" : "Guardian network established",
    },
  ];

  const allHealthy = indicators.every(i => i.healthy);

  return (
    <div
      style={{
        background:   "#fff",
        borderRadius: 16,
        border:       `1px solid ${allHealthy ? "#bbf7d0" : "#e7e5e4"}`,
        padding:      "20px 22px",
        marginBottom: 14,
      }}
    >
      <SectionHeader
        title="Family Health"
        action={
          !loading ? (
            <span
              style={{
                fontSize:     11,
                fontWeight:   700,
                color:        allHealthy ? "#065f46" : "#92400e",
                background:   allHealthy ? "#d1fae5" : "#fef3c7",
                borderRadius: 20,
                padding:      "3px 10px",
              }}
            >
              {allHealthy ? "Healthy" : "Needs attention"}
            </span>
          ) : undefined
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {indicators.map(ind => (
          <div
            key={ind.label}
            style={{
              display:     "flex",
              alignItems:  "flex-start",
              gap:         10,
              padding:     "10px 12px",
              borderRadius: 10,
              background:  ind.healthy ? "#f0fdf4" : "#fffbeb",
              border:      `1px solid ${ind.healthy ? "#bbf7d0" : "#fde68a"}`,
              opacity:     loading ? 0.5 : 1,
            }}
          >
            <span
              style={{
                flexShrink: 0,
                marginTop:  1,
                fontWeight: 700,
                fontSize:   14,
                color:      ind.healthy ? "#059669" : "#d97706",
              }}
            >
              {ind.healthy ? "✓" : "!"}
            </span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#1c1917" }}>
                {loading ? "–" : ind.label}
              </div>
              {ind.detail && !loading && (
                <div style={{ fontSize: 11, color: "#78716c", marginTop: 2 }}>
                  {ind.detail}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {allHealthy && !loading && (
        <p
          style={{
            fontSize:   12,
            color:      "#059669",
            fontWeight: 600,
            marginTop:  14,
            marginBottom: 0,
            textAlign:  "center",
          }}
        >
          🌱 Healthy trust network
        </p>
      )}
    </div>
  );
}
