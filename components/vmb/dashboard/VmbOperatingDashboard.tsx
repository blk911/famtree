"use client";

import { useMemo } from "react";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import { ActionBlock } from "@/components/vmb/feed/ActionBlock";
import { buildAppointmentOpeningsSummary, buildVmbOperatingSnapshot } from "@/lib/vmb/operating-system";
import { buildVmbInviteSectionHref } from "@/lib/vmb/salon-href";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

const HOME_OFFERS = [
  "Gel X Refresh",
  "Gloss + Blowout",
  "Birthday Touch",
  "Bring A Friend",
] as const;

const FEED_MAX = 640;

type Props = {
  analysis: VmbBookAnalysisResult;
};

export function VmbOperatingDashboard({ analysis }: Props) {
  const snapshot = useMemo(
    () => buildVmbOperatingSnapshot(analysis, { inviteState: { invited: 0, joined: 0 } }),
    [analysis],
  );

  if (!snapshot) return null;

  const analysisId = analysis.analysisId;
  const inviteReady = snapshot.network.readyThisWeek;
  const inviteNames = snapshot.network.candidates.map((c) => c.clientName);
  const welcomeRows = snapshot.newClients.rows;
  const revenue = snapshot.weeklyRevenue;
  const openings = buildAppointmentOpeningsSummary(analysis);

  return (
    <VmbPageFrame
      width="feed"
      titleVariant="home"
      eyebrow={snapshot.salonName}
      title="This Week"
      subtitle="VMB found your next relationship moves."
    >
      <ActionBlock
        title="Launch My Private Client Network"
        summary={`${inviteReady} invites ready`}
        names={inviteNames}
        ctaLabel="Preview Invites"
        ctaHref={buildVmbInviteSectionHref(analysisId, "private_client_network")}
      />

      <ActionBlock
        title="Revenue Moves"
        summary={`${revenue.readyThisWeek} touches ready · $${revenue.potentialRevenue.toLocaleString()} potential`}
        names={revenue.opportunities.map((o) => o.clientName)}
        ctaLabel="Review Revenue Moves"
        ctaHref={buildVmbInviteSectionHref(analysisId, "revenue_touch")}
        ctaDisabled={revenue.opportunities.length === 0}
      />

      <ActionBlock
        title="Welcome New Clients"
        summary={`${welcomeRows.length} welcomes ready`}
        names={welcomeRows.map((r) => r.clientName)}
        ctaLabel="Preview Welcomes"
        ctaHref={buildVmbInviteSectionHref(analysisId, "new_client_welcome")}
        ctaDisabled={welcomeRows.length === 0}
      />

      <ActionBlock
        title="Open Appointment Windows"
        summary={`${openings.count} opening${openings.count === 1 ? "" : "s"} this week`}
        names={openings.slots}
        ctaLabel="Review Fill Options"
        ctaDisabled
      />

      <ActionBlock
        title="Standard Offers"
        summary=""
        ctaLabel="Manage Later"
        ctaDisabled
      >
        <ul style={{ margin: "0 0 4px", padding: "0 0 0 16px", fontSize: 14, color: VMB_THEME.muted }}>
          {HOME_OFFERS.map((offer) => (
            <li key={offer} style={{ marginBottom: 4 }}>
              {offer}
            </li>
          ))}
        </ul>
      </ActionBlock>
    </VmbPageFrame>
  );
}
