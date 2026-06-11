"use client";

import { useMemo, useState } from "react";
import { ActionBlock } from "@/components/vmb/feed/ActionBlock";
import { InviteDraftPreviewModal } from "@/components/vmb/dashboard/InviteDraftPreviewModal";
import { useInviteDrafts } from "@/components/vmb/dashboard/useInviteDrafts";
import { InviteQueue } from "@/components/vmb/workflows/InviteQueue";
import { RevenueQueue } from "@/components/vmb/workflows/RevenueQueue";
import { WelcomeQueue } from "@/components/vmb/workflows/WelcomeQueue";
import { buildAppointmentOpeningsSummary, buildVmbOperatingSnapshot } from "@/lib/vmb/operating-system";
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
  const { drafts, loading: draftsLoading, saving, patchDraft } = useInviteDrafts({
    analysis,
    isDemo: false,
  });

  const [inviteQueueOpen, setInviteQueueOpen] = useState(false);
  const [revenueQueueOpen, setRevenueQueueOpen] = useState(false);
  const [welcomeQueueOpen, setWelcomeQueueOpen] = useState(false);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

  const snapshot = useMemo(
    () => buildVmbOperatingSnapshot(analysis, { inviteState: { invited: 0, joined: 0 } }),
    [analysis],
  );

  if (!snapshot) return null;

  const inviteReady =
    drafts.length > 0
      ? drafts.filter((d) => d.status === "draft").length
      : snapshot.network.readyThisWeek;
  const inviteNames =
    drafts.length > 0
      ? drafts.map((d) => d.clientName)
      : snapshot.network.candidates.map((c) => c.clientName);
  const activeDraft = drafts.find((d) => d.draftId === activeDraftId) ?? null;

  const welcomeRows = snapshot.newClients.rows;
  const revenue = snapshot.weeklyRevenue;
  const openings = buildAppointmentOpeningsSummary(analysis);

  return (
    <div style={{ maxWidth: FEED_MAX, margin: "0 auto", padding: "32px 20px 72px" }}>
      <header style={{ marginBottom: 4, paddingBottom: 20, borderBottom: `1px solid ${VMB_THEME.line}` }}>
        <p style={{ margin: "0 0 10px", fontSize: 14, color: VMB_THEME.muted }}>
          {snapshot.salonName}
        </p>
        <h1
          style={{
            margin: "0 0 10px",
            fontSize: "clamp(26px, 4vw, 34px)",
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          This Week
        </h1>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: VMB_THEME.muted }}>
          VMB found your next relationship moves.
        </p>
      </header>

      <ActionBlock
        title="Launch My Private Client Network"
        summary={`${inviteReady} invites ready`}
        names={inviteNames}
        ctaLabel="Preview Invites"
        onCta={() => setInviteQueueOpen(true)}
        ctaDisabled={draftsLoading && inviteNames.length === 0}
      />

      <ActionBlock
        title="Revenue Moves"
        summary={`${revenue.readyThisWeek} touches ready · $${revenue.potentialRevenue.toLocaleString()} potential`}
        names={revenue.opportunities.map((o) => o.clientName)}
        ctaLabel="Review Revenue Moves"
        onCta={() => setRevenueQueueOpen(true)}
        ctaDisabled={revenue.opportunities.length === 0}
      />

      <ActionBlock
        title="Welcome New Clients"
        summary={`${welcomeRows.length} welcomes ready`}
        names={welcomeRows.map((r) => r.clientName)}
        ctaLabel="Preview Welcomes"
        onCta={() => setWelcomeQueueOpen(true)}
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

      {inviteQueueOpen ? (
        <InviteQueue
          drafts={drafts}
          onClose={() => setInviteQueueOpen(false)}
          onPreview={(id) => {
            setInviteQueueOpen(false);
            setActiveDraftId(id);
          }}
        />
      ) : null}

      {revenueQueueOpen ? (
        <RevenueQueue
          opportunities={revenue.opportunities}
          analysisId={analysis.analysisId}
          onClose={() => setRevenueQueueOpen(false)}
        />
      ) : null}

      {welcomeQueueOpen ? (
        <WelcomeQueue rows={welcomeRows} onClose={() => setWelcomeQueueOpen(false)} />
      ) : null}

      {activeDraft ? (
        <InviteDraftPreviewModal
          draft={activeDraft}
          saving={saving}
          onClose={() => setActiveDraftId(null)}
          onApprove={(message) => {
            void patchDraft(activeDraft.draftId, { editableMessage: message, status: "approved" });
            setActiveDraftId(null);
          }}
          onSkip={() => {
            void patchDraft(activeDraft.draftId, { status: "skipped" });
            setActiveDraftId(null);
          }}
        />
      ) : null}
    </div>
  );
}
